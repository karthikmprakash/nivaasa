import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveries, panicAlerts, patrolCheckpoints, patrolRounds, staff, staffAttendance, units, users, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { communityDayStart } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["guard", "security_manager", "admin", "manager"].includes(session.membership.role) && session.user.globalRole !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const today = todayISO();
  const dayStart = communityDayStart(today) ?? new Date();
  const [queue, passRows, unitRows, activityRows, deliveryRows, staffRows, attendance, checkpoints, rounds, alerts] = await Promise.all([
    // Only requests still awaiting a resident decision are "waiting"; approved
    // walk-ins are admitted via their code and don't belong in this list.
    db.select({ visitor: visitors, unit: units.number, hostPhone: users.phone }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).leftJoin(users, eq(visitors.hostUserId, users.id)).where(and(eq(visitors.societyId, session.society.id), eq(visitors.preApproved, false), eq(visitors.leaveAtGate, false), eq(visitors.status, "pending"), gte(visitors.createdAt, new Date(Date.now() - 24 * 3600 * 1000)))).orderBy(desc(visitors.createdAt)).limit(30),
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(and(eq(visitors.societyId, session.society.id), eq(visitors.preApproved, true), eq(visitors.status, "approved"))).limit(20),
    db.select({ id: units.id, number: units.number, tower: units.towerId }).from(units).where(eq(units.societyId, session.society.id)).orderBy(units.number),
    // Full activity feed for the Entries tab: every visitor event today, all
    // statuses, with home and host phone for exit/call actions. Include rows
    // created today OR entered/exited today (a pass created days ago but used
    // today must still show up).
    db.select({ visitor: visitors, unit: units.number, hostPhone: users.phone, hostName: users.name }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).leftJoin(users, eq(visitors.hostUserId, users.id)).where(and(eq(visitors.societyId, session.society.id), or(gte(visitors.createdAt, dayStart), gte(visitors.enteredAt, dayStart), gte(visitors.exitedAt, dayStart)))).orderBy(desc(visitors.createdAt)).limit(100),
    db.select({ delivery: deliveries, unit: units.number }).from(deliveries).leftJoin(units, eq(deliveries.unitId, units.id)).where(and(eq(deliveries.societyId, session.society.id), inArray(deliveries.status, ["arrived", "left_at_gate"]))),
    db.select({ person: staff, unit: units.number }).from(staff).leftJoin(units, eq(staff.unitId, units.id)).where(and(eq(staff.societyId, session.society.id), eq(staff.active, true))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.societyId, session.society.id), eq(staffAttendance.date, today))),
    db.select().from(patrolCheckpoints).where(eq(patrolCheckpoints.societyId, session.society.id)).orderBy(patrolCheckpoints.sortOrder),
    db.select().from(patrolRounds).where(and(eq(patrolRounds.societyId, session.society.id), gte(patrolRounds.scannedAt, dayStart))),
    db.select({ alert: panicAlerts, unit: units.number, user: users.name }).from(panicAlerts).leftJoin(units, eq(panicAlerts.unitId, units.id)).leftJoin(users, eq(panicAlerts.userId, users.id)).where(and(eq(panicAlerts.societyId, session.society.id), inArray(panicAlerts.status, ["open", "acknowledged"]))),
  ]);
  return NextResponse.json({
    queue: queue.map((q) => ({ ...q.visitor, unit: q.unit, hostPhone: q.hostPhone })),
    // Security sees the list, never the entry codes — those belong to the visitor/resident.
    passes: passRows.map((p) => ({ ...p.visitor, unit: p.unit, code: null })),
    units: unitRows,
    activity: activityRows.map((a) => ({ ...a.visitor, unit: a.unit, hostPhone: a.hostPhone, hostName: a.hostName, code: null })),
    deliveries: deliveryRows.map((d) => ({ ...d.delivery, unit: d.unit })),
    staff: staffRows.map((s) => ({ ...s.person, unit: s.unit, attendance: attendance.find((a) => a.staffId === s.person.id) ?? null })),
    checkpoints: checkpoints.map((c) => ({ ...c, scanned: rounds.some((r) => r.checkpointId === c.id && r.status === "scanned") })),
    alerts: alerts.map((a) => ({ ...a.alert, unit: a.unit, user: a.user })),
  });
}
