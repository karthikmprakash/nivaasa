import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayISO } from "@/lib/utils";
import { db } from "@/db";
import { notifications, staff, staffAttendance } from "@/db/schema";
import { gateSession } from "@/lib/gate";

const schema = z.object({ staffId: z.string(), action: z.enum(["in", "out"]) });

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [person] = await db.select().from(staff).where(and(eq(staff.id, parsed.data.staffId), eq(staff.societyId, session.society!.id))).limit(1);
  if (!person) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  const today = todayISO();
  const [existing] = await db.select().from(staffAttendance).where(and(eq(staffAttendance.staffId, person.id), eq(staffAttendance.date, today))).limit(1);
  const now = new Date();
  if (parsed.data.action === "out") {
    if (existing) await db.update(staffAttendance).set({ checkOutAt: now }).where(eq(staffAttendance.id, existing.id));
  } else if (existing) {
    await db.update(staffAttendance).set({ checkInAt: existing.checkInAt ?? now }).where(eq(staffAttendance.id, existing.id));
  } else {
    await db.insert(staffAttendance).values({ id: crypto.randomUUID(), societyId: session.society!.id, staffId: person.id, unitId: person.unitId, date: today, checkInAt: now, method: "guard", markedBy: session.user.id });
  }
  if (person.unitId && person.kind === "daily_help") {
    const { memberships } = await import("@/db/schema");
    const residents = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.unitId, person.unitId), eq(memberships.societyId, session.society!.id)));
    if (residents.length) await db.insert(notifications).values(residents.map((r) => ({ id: crypto.randomUUID(), userId: r.userId, societyId: session.society!.id, title: `${person.name} ${parsed.data.action === "out" ? "left" : "arrived"}`, body: parsed.data.action === "out" ? "Daily help check-out recorded at the gate." : `Checked in at Gate 1 for your home.`, type: "security" as const, link: "/app/my-home", createdAt: now })));
  }
  revalidatePath("/gate"); revalidatePath("/admin/staff"); revalidatePath("/app/my-home");
  return NextResponse.json({ ok: true });
}
