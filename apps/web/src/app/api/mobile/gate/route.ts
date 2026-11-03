import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveries, panicAlerts, patrolCheckpoints, patrolRounds, staff, staffAttendance, units, users, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["guard", "security_manager", "admin", "manager"].includes(session.membership.role) && session.user.globalRole !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const today = todayISO();
  const [queue, passRows, deliveryRows, staffRows, attendance, checkpoints, rounds, alerts] = await Promise.all([
    db.select({ visitor: visitors, unit: units.number, hostPhone: users.phone }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).leftJoin(users, eq(visitors.hostUserId, users.id)).where(and(eq(visitors.societyId, session.society.id), inArray(visitors.status, ["pending", "approved"]), gte(visitors.createdAt, new Date(Date.now() - 24 * 3600 * 1000)))).orderBy(desc(visitors.createdAt)).limit(30),
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(and(eq(visitors.societyId, session.society.id), eq(visitors.preApproved, true), eq(visitors.status, "approved"))).limit(20),
    db.select({ delivery: deliveries, unit: units.number }).from(deliveries).leftJoin(units, eq(deliveries.unitId, units.id)).where(and(eq(deliveries.societyId, session.society.id), inArray(deliveries.status, ["arrived", "left_at_gate"]))),
    db.select({ person: staff, unit: units.number }).from(staff).leftJoin(units, eq(staff.unitId, units.id)).where(and(eq(staff.societyId, session.society.id), eq(staff.active, true))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.societyId, session.society.id), eq(staffAttendance.date, today))),
    db.select().from(patrolCheckpoints).where(eq(patrolCheckpoints.societyId, session.society.id)).orderBy(patrolCheckpoints.sortOrder),
    db.select().from(patrolRounds).where(and(eq(patrolRounds.societyId, session.society.id), gte(patrolRounds.scannedAt, new Date(today)))),
    db.select({ alert: panicAlerts, unit: units.number, user: users.name }).from(panicAlerts).leftJoin(units, eq(panicAlerts.unitId, units.id)).leftJoin(users, eq(panicAlerts.userId, users.id)).where(and(eq(panicAlerts.societyId, session.society.id), inArray(panicAlerts.status, ["open", "acknowledged"]))),
  ]);
  return NextResponse.json({
    queue: queue.map((q) => ({ ...q.visitor, unit: q.unit, hostPhone: q.hostPhone })),
    passes: passRows.map((p) => ({ ...p.visitor, unit: p.unit })),
    deliveries: deliveryRows.map((d) => ({ ...d.delivery, unit: d.unit })),
    staff: staffRows.map((s) => ({ ...s.person, unit: s.unit, attendance: attendance.find((a) => a.staffId === s.person.id) ?? null })),
    checkpoints: checkpoints.map((c) => ({ ...c, scanned: rounds.some((r) => r.checkpointId === c.id && r.status === "scanned") })),
    alerts: alerts.map((a) => ({ ...a.alert, unit: a.unit, user: a.user })),
  });
}
