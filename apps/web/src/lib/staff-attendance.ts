import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships, notifications, staff, staffAttendance } from "@/db/schema";
import { todayISO } from "@/lib/utils";

type AttendanceResult = { error: string; status: number } | { ok: true; changed: boolean };

export function recordStaffAttendance(societyId: string, actorId: string, staffId: string, direction: "in" | "out"): AttendanceResult {
  const date = todayISO();
  const now = new Date();
  return db.transaction((tx): AttendanceResult => {
    const person = tx.select().from(staff).where(and(eq(staff.id, staffId), eq(staff.societyId, societyId))).get();
    if (!person) return { error: "Staff member not found.", status: 404 };
    const existing = tx.select().from(staffAttendance).where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.date, date))).get();

    if (direction === "out" && !existing?.checkInAt) return { error: "Check in before checking out.", status: 409 };
    if (direction === "out" && existing?.checkOutAt) return { ok: true, changed: false };
    if (direction === "in") {
      if (!person.active) return { error: "This staff registration is inactive.", status: 409 };
      if (person.kind === "daily_help" && !person.policeVerified) return { error: "Security must verify this registration before check-in.", status: 409 };
      if (existing?.checkOutAt) return { error: "Today’s check-in and check-out are complete.", status: 409 };
      if (existing?.checkInAt) return { ok: true, changed: false };
    }

    if (existing) {
      tx.update(staffAttendance).set(direction === "out" ? { checkOutAt: now } : { checkInAt: now, checkOutAt: null })
        .where(eq(staffAttendance.id, existing.id)).run();
    } else {
      tx.insert(staffAttendance).values({
        id: crypto.randomUUID(), societyId, staffId, unitId: person.unitId,
        date, checkInAt: now, method: "guard", markedBy: actorId,
      }).run();
    }
    if (person.unitId && person.kind === "daily_help") {
      const residents = tx.select({ userId: memberships.userId }).from(memberships).where(and(
        eq(memberships.unitId, person.unitId), eq(memberships.societyId, societyId), eq(memberships.status, "active"),
        inArray(memberships.role, ["owner", "tenant", "committee", "family"]),
      )).all();
      if (residents.length) tx.insert(notifications).values(residents.map(({ userId }) => ({
        id: crypto.randomUUID(), userId, societyId,
        title: `${person.name} ${direction === "in" ? "arrived" : "left"}`,
        body: `Daily help check-${direction} recorded at the gate.`, type: "security" as const,
        link: "/app/my-home#help", createdAt: now,
      }))).run();
    }
    return { ok: true, changed: true };
  }, { behavior: "immediate" });
}
