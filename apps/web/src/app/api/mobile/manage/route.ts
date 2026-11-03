import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { discussions, helpdeskTickets, invoices, memberships, moveRequests, payments, units, users, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["admin", "manager", "committee", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(session.membership.role) && session.user.globalRole !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const societyId = session.society.id;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [collected, outstanding, tickets, visitorCount, unitsCount, pendingPayments, pendingDiscussions, moves] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` }).from(payments).where(and(eq(payments.societyId, societyId), eq(payments.status, "success"), gte(payments.paidAt, monthStart))),
    db.select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)`, c: count() }).from(invoices).where(and(eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))),
    db.select({ c: count() }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))),
    db.select({ c: count() }).from(visitors).where(and(eq(visitors.societyId, societyId), gte(visitors.createdAt, monthStart))),
    db.select({ c: count() }).from(units).where(eq(units.societyId, societyId)),
    db.select({ payment: payments, unit: units.number, user: users.name }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).leftJoin(users, eq(payments.userId, users.id)).where(and(eq(payments.societyId, societyId), eq(payments.status, "pending"))).limit(10),
    db.select({ d: discussions, user: users.name }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "pending"))).limit(10),
    db.select({ r: moveRequests, unit: units.number, user: users.name }).from(moveRequests).innerJoin(units, eq(moveRequests.unitId, units.id)).innerJoin(users, eq(moveRequests.userId, users.id)).where(and(eq(moveRequests.societyId, societyId), eq(moveRequests.status, "pending"))).limit(10),
  ]);
  return NextResponse.json({ society: session.society.name, collections: collected[0]?.total ?? 0, outstanding: outstanding[0]?.total ?? 0, outstandingCount: outstanding[0]?.c ?? 0, openTickets: tickets[0]?.c ?? 0, visitors: visitorCount[0]?.c ?? 0, units: unitsCount[0]?.c ?? 0, pendingPayments, pendingDiscussions, moves });
}
