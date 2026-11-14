import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import { validatePassRequest } from "@/lib/visitor-pass-rules";
import { saveVisitorPasses } from "@/lib/visitor-passes";

const schema = z.object({
  names: z.array(z.string().trim().min(1).max(80)).min(2).max(20),
  validFrom: z.string(),
  validTo: z.string(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.unit || !session.society || session.membership?.role === "guard" || session.user.globalRole === "super_admin") {
    return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  }
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter 2–20 guest names, up to 80 characters each." }, { status: 400 });
  const { names, validFrom, validTo } = input.data;
  const today = todayISO();
  const passes: NonNullable<ReturnType<typeof validatePassRequest>["pass"]>[] = [];
  for (const name of names) {
    const result = validatePassRequest({ type: "guest", name, validFrom, validTo }, today);
    if (!result.pass) return NextResponse.json({ error: Object.values(result.fieldErrors)[0] }, { status: 400 });
    passes.push(result.pass);
  }
  const saved = saveVisitorPasses(passes, {
    societyId: session.society.id, unitId: session.unit.id, userId: session.user.id, name: session.user.name,
  });
  return NextResponse.json({ passes: saved }, { status: 201 });
}
