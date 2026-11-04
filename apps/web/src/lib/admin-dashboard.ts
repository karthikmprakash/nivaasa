import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { amenities, amenityBookings, deliveries, discussions, expenses, helpdeskTickets, invoices, moveRequests, panicAlerts, patrolRounds, payments, staff, staffAttendance, units, users, visitors } from "@/db/schema";
import { getAdminSnapshot } from "@/lib/queries";
import { communityMonthKey, communityMonthStart } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";

/** Fetch and compose the dashboard on the server; the route owns presentation. */
export async function getAdminDashboardData(societyId: string) {
  const now = new Date();
  const today = todayISO();
  const [currentYear, currentMonth] = today.split("-").map(Number);
  const start6 = communityMonthStart(new Date(currentYear, currentMonth - 1 - 5, 1));
  const start6Key = communityMonthKey(start6);
  const [snapshot, payRows, expRows, topDues, pendingPayments, pendingDiscussions, pendingMoves, openPanics, recentVisitors, ticketCats, patrolRows, staffToday, staffCount, bookingRows, deliveryToday, avgClosureRows] = await Promise.all([
    getAdminSnapshot(societyId),
    db.select({ paidAt: payments.paidAt, amount: payments.amount }).from(payments).where(and(eq(payments.societyId, societyId), eq(payments.status, "success"), gte(payments.paidAt, start6))),
    db.select({ date: expenses.date, amount: expenses.amount }).from(expenses).where(and(eq(expenses.societyId, societyId), gte(expenses.date, `${start6Key}-01`))),
    db.select({ unit: units.number, total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)` }).from(invoices).innerJoin(units, eq(invoices.unitId, units.id)).where(and(eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))).groupBy(units.number).orderBy(desc(sql`sum(${invoices.total} - ${invoices.amountPaid})`)).limit(6),
    db.select({ payment: payments, unit: units.number, user: users.name }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).leftJoin(users, eq(payments.userId, users.id)).where(and(eq(payments.societyId, societyId), eq(payments.status, "pending"))).orderBy(desc(payments.createdAt)).limit(4),
    db.select({ discussion: discussions, user: users.name }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "pending"))).orderBy(desc(discussions.createdAt)).limit(4),
    db.select({ request: moveRequests, unit: units.number, user: users.name }).from(moveRequests).innerJoin(units, eq(moveRequests.unitId, units.id)).innerJoin(users, eq(moveRequests.userId, users.id)).where(and(eq(moveRequests.societyId, societyId), eq(moveRequests.status, "pending"))).limit(4),
    db.select({ alert: panicAlerts, unit: units.number, user: users.name }).from(panicAlerts).leftJoin(units, eq(panicAlerts.unitId, units.id)).leftJoin(users, eq(panicAlerts.userId, users.id)).where(and(eq(panicAlerts.societyId, societyId), inArray(panicAlerts.status, ["open", "acknowledged"]))).limit(4),
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(eq(visitors.societyId, societyId)).orderBy(desc(visitors.createdAt)).limit(6),
    db.select({ category: helpdeskTickets.category, count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))).groupBy(helpdeskTickets.category).orderBy(desc(sql`count(*)`)).limit(5),
    db.select({ status: patrolRounds.status, count: sql<number>`count(*)` }).from(patrolRounds).where(and(eq(patrolRounds.societyId, societyId), gte(patrolRounds.scannedAt, new Date(`${today}T00:00:00+05:30`)))).groupBy(patrolRounds.status),
    db.select({ count: sql<number>`count(*)` }).from(staffAttendance).where(and(eq(staffAttendance.societyId, societyId), eq(staffAttendance.date, today))),
    db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.societyId, societyId), eq(staff.active, true))),
    db.select({ booking: amenityBookings, amenity: amenities.name, unit: units.number }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).innerJoin(units, eq(amenityBookings.unitId, units.id)).where(and(eq(amenityBookings.societyId, societyId), gte(amenityBookings.date, today), eq(amenityBookings.status, "confirmed"))).orderBy(amenityBookings.date).limit(4),
    db.select({ count: sql<number>`count(*)` }).from(deliveries).where(and(eq(deliveries.societyId, societyId), gte(deliveries.createdAt, new Date(`${today}T00:00:00+05:30`)))),
    db.select({ avg: sql<number>`coalesce(avg((${helpdeskTickets.resolvedAt} - ${helpdeskTickets.createdAt}) / 3600000.0), 0)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), sql`${helpdeskTickets.resolvedAt} is not null`)),
  ]);
  const avgClosure = avgClosureRows[0]?.avg ?? 0;
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(currentYear, currentMonth - 1 - (5 - i), 1);
    const key = communityMonthKey(d);
    const collected = payRows.filter((p) => communityMonthKey(p.paidAt) === key).reduce((s, p) => s + p.amount, 0) / 100;
    const spent = expRows.filter((e) => e.date.slice(0, 7) === key).reduce((s, e) => s + e.amount, 0) / 100;
    return { month: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" }), collected, expenses: spent };
  });
  const thisMonth = monthly[5]?.collected ?? 0;
  const prevMonth = monthly[4]?.collected ?? 0;
  const growth = prevMonth ? ((thisMonth - prevMonth) / prevMonth) * 100 : null;
  const patrolScanned = patrolRows.find((p) => p.status === "scanned")?.count ?? 0;
  const patrolMissed = patrolRows.find((p) => p.status === "missed")?.count ?? 0;
  const maxCategory = Math.max(1, ...ticketCats.map((t) => t.count));
  const attention = pendingPayments.length + pendingDiscussions.length + pendingMoves.length + openPanics.length + (snapshot.slaRisk ? 1 : 0);
  return { now, snapshot, monthly, growth, pendingPayments, pendingDiscussions, pendingMoves, openPanics, recentVisitors, ticketCats, patrolScanned, patrolMissed, staffToday, staffCount, bookingRows, deliveryToday, avgClosure, topDues, maxCategory, attention };
}
