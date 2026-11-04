import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { gateSession } from "@/lib/gate";
import { recordStaffAttendance } from "@/lib/staff-attendance";
import { phoneKey, validVisitorPhone } from "@/lib/visitor-pass-rules";

const schema = z.union([
  z.object({ action: z.literal("lookup"), phone: z.string().trim().max(30).refine(validVisitorPhone) }),
  z.object({ staffId: z.string(), action: z.enum(["in", "out"]) }),
]);

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session?.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number or attendance action." }, { status: 400 });
  const data = parsed.data;
  if (data.action === "lookup") {
    const people = await db.select({ id: staff.id, phone: staff.phone }).from(staff).where(and(
      eq(staff.societyId, session.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true),
    ));
    const key = phoneKey(data.phone);
    return NextResponse.json({ ids: people.filter((person) => phoneKey(person.phone) === key).map(({ id }) => id) });
  }
  const result = recordStaffAttendance(session.society.id, session.user.id, data.staffId, data.action);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  for (const path of ["/gate", "/admin/staff", "/app/my-home", "/app/visitors"]) revalidatePath(path);
  return NextResponse.json(result);
}
