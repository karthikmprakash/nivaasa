import "server-only";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { todayISO } from "@/lib/utils";
import { db } from "@/db";
import {
  amenities, amenityBookings, events, expenses, helpdeskTickets, invoices, memberships, notices, notifications,
  payments, polls, pollVotes, societies, units, visitors, deliveries, familyMembers, vehicles, pets,
} from "@/db/schema";
import { getSession, isAdminRole, type AuthContext } from "./auth";
import { noticeAudiencesForRole, pollAudiencesForRole } from "./community-access";
import { communityMonthStart } from "./datetime";
import type { SocietyOption } from "./society-access";

export type ResidentContext = AuthContext & { unit: NonNullable<AuthContext["unit"]>; society: NonNullable<AuthContext["society"]>; membership: NonNullable<AuthContext["membership"]> };

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireResident(): Promise<ResidentContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.globalRole === "super_admin") redirect("/portfolio");
  const role = session.membership?.role;
  if (role === "guard") redirect("/gate");
  if (!session.membership || !session.society) {
    if (isAdminRole(role)) redirect("/admin");
    redirect("/login");
  }
  if (!session.unit) {
    if (isAdminRole(role)) redirect("/admin");
    redirect("/login");
  }
  return session as ResidentContext;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.society) redirect(session.user.globalRole === "super_admin" ? "/portfolio" : "/login");
  if (session.user.globalRole === "super_admin") return session;
  if (!session.membership || !isAdminRole(session.membership.role)) redirect("/app");
  if (session.membership.role === "guard") redirect("/gate");
  return session;
}

/** Every active society membership for the account menu/switcher. */
export async function getSocietyOptions(ctx: AuthContext): Promise<SocietyOption[]> {
  if (!ctx.memberships.length) return [];
  return db
    .select({
      id: societies.id,
      name: societies.name,
      slug: societies.slug,
      city: societies.city,
      role: memberships.role,
      unitNumber: units.number,
      isPrimary: memberships.isPrimary,
    })
    .from(memberships)
    .innerJoin(societies, eq(memberships.societyId, societies.id))
    .leftJoin(units, eq(memberships.unitId, units.id))
    .where(and(eq(memberships.userId, ctx.user.id), eq(memberships.status, "active")))
    .orderBy(desc(memberships.isPrimary), memberships.joinedAt);
}

/** Enforce the same role set used by the admin navigation for direct URLs. */
export async function requireAdminRole(roles: readonly string[]) {
  const ctx = await requireAdmin();
  if (ctx.user.globalRole === "super_admin") return ctx;
  if (!ctx.membership || !roles.includes(ctx.membership.role)) redirect("/admin");
  return ctx;
}

export async function requireGuard() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = session.membership?.role;
  if (role !== "guard" && role !== "security_manager" && role !== "admin" && session.user.globalRole !== "super_admin") redirect("/app");
  if (!session.society) redirect(session.user.globalRole === "super_admin" ? "/portfolio" : "/login");
  return session;
}

export async function getUnreadCount(userId: string, societyId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.societyId, societyId), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

export async function getResidentCounts(unitId: string, societyId: string, userId: string) {
  const [visitorRow, deliveryRow, unread] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(visitors).where(and(eq(visitors.unitId, unitId), eq(visitors.societyId, societyId), eq(visitors.status, "pending"))),
    db.select({ count: sql<number>`count(*)` }).from(deliveries).where(and(eq(deliveries.unitId, unitId), eq(deliveries.societyId, societyId), inArray(deliveries.status, ["arrived", "left_at_gate"]))),
    getUnreadCount(userId, societyId),
  ]);
  return { visitors: visitorRow[0]?.count ?? 0, deliveries: deliveryRow[0]?.count ?? 0, unread };
}

export async function getDuesSummary(unitId: string, societyId: string) {
  const rows = await db
    .select({
      total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)`,
      count: sql<number>`count(*)`,
      overdue: sql<number>`coalesce(sum(case when ${invoices.status} = 'overdue' then 1 else 0 end), 0)`,
    })
    .from(invoices)
    .where(and(eq(invoices.unitId, unitId), eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"])));
  return { total: rows[0]?.total ?? 0, count: rows[0]?.count ?? 0, overdue: rows[0]?.overdue ?? 0 };
}

export async function getResidentHomeData(ctx: ResidentContext) {
  const unitId = ctx.unit.id;
  const societyId = ctx.society.id;
  const userId = ctx.user.id;
  const now = new Date();
  const [dues, pendingVisitors, noticesRows, eventsRows, activePolls, openTickets, upcomingBookings, deliveriesRows, recentPayments, pollVotesRows, familyCount, vehicleCount, petCount] = await Promise.all([
    getDuesSummary(unitId, societyId),
    db.select().from(visitors).where(and(eq(visitors.unitId, unitId), eq(visitors.status, "pending"))).orderBy(desc(visitors.createdAt)),
    db.select().from(notices).where(and(eq(notices.societyId, societyId), or(inArray(notices.audience, noticeAudiencesForRole(ctx.membership.role)), and(eq(notices.audience, "tower"), eq(notices.towerId, ctx.unit.towerId))))).orderBy(desc(notices.pinned), desc(notices.publishedAt)).limit(4),
    db.select().from(events).where(and(eq(events.societyId, societyId), gte(events.startAt, now))).orderBy(events.startAt).limit(3),
    db.select().from(polls).where(and(eq(polls.societyId, societyId), eq(polls.status, "active"), inArray(polls.audience, pollAudiencesForRole(ctx.membership.role)), or(isNull(polls.endsAt), gte(polls.endsAt, now)))).orderBy(desc(polls.createdAt)),
    db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.unitId, unitId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))).orderBy(desc(helpdeskTickets.updatedAt)).limit(3),
    db.select({ booking: amenityBookings, amenity: amenities }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(and(eq(amenityBookings.unitId, unitId), eq(amenityBookings.status, "confirmed"), gte(amenityBookings.date, todayISO()))).orderBy(amenityBookings.date).limit(2),
    db.select().from(deliveries).where(and(eq(deliveries.unitId, unitId), inArray(deliveries.status, ["arrived", "left_at_gate"]))).orderBy(desc(deliveries.createdAt)),
    db.select().from(payments).where(and(eq(payments.unitId, unitId), eq(payments.status, "success"))).orderBy(desc(payments.paidAt)).limit(3),
    db.select().from(pollVotes).where(eq(pollVotes.userId, userId)),
    db.select({ count: sql<number>`count(*)` }).from(familyMembers).where(eq(familyMembers.membershipId, ctx.membership.id)),
    db.select({ count: sql<number>`count(*)` }).from(vehicles).where(and(eq(vehicles.unitId, unitId), eq(vehicles.societyId, societyId))),
    db.select({ count: sql<number>`count(*)` }).from(pets).where(and(eq(pets.unitId, unitId), eq(pets.societyId, societyId))),
  ]);
  const votedPollIds = new Set(pollVotesRows.map((v) => v.pollId));
  return { dues, pendingVisitors, notices: noticesRows, events: eventsRows, polls: activePolls, votedPollIds, openTickets, upcomingBookings, deliveries: deliveriesRows, recentPayments,
    household: { family: (familyCount[0]?.count ?? 0) + 1, vehicles: vehicleCount[0]?.count ?? 0, pets: petCount[0]?.count ?? 0 },
  };
}

export async function getNotifications(userId: string, societyId: string, limit = 30) {
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.societyId, societyId))).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function getAdminSnapshot(societyId: string) {
  const startOfMonth = communityMonthStart();
  const monthStartKey = `${todayISO().slice(0, 7)}-01`;
  const [collections, outstanding, openTickets, visitorCount, bookingCount, unitCount, expenseTotal, slaRisk] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` }).from(payments).where(and(eq(payments.societyId, societyId), eq(payments.status, "success"), gte(payments.paidAt, startOfMonth))),
    db.select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)`, count: sql<number>`count(*)` }).from(invoices).where(and(eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))),
    db.select({ count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))),
    db.select({ count: sql<number>`count(*)` }).from(visitors).where(and(eq(visitors.societyId, societyId), gte(visitors.enteredAt, startOfMonth))),
    db.select({ count: sql<number>`count(*)` }).from(amenityBookings).where(and(eq(amenityBookings.societyId, societyId), eq(amenityBookings.status, "confirmed"))),
    db.select({ count: sql<number>`count(*)` }).from(units).where(eq(units.societyId, societyId)),
    db.select({ total: sql<number>`coalesce(sum(${expenses.amount}),0)` }).from(expenses).where(and(eq(expenses.societyId, societyId), gte(expenses.date, monthStartKey))),
    db.select({ count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]), lte(helpdeskTickets.slaDueAt, new Date(Date.now() + 4 * 3600 * 1000)))),
  ]);
  return {
    collections: collections[0]?.total ?? 0,
    outstanding: outstanding[0]?.total ?? 0,
    outstandingCount: outstanding[0]?.count ?? 0,
    openTickets: openTickets[0]?.count ?? 0,
    visitors: visitorCount[0]?.count ?? 0,
    bookings: bookingCount[0]?.count ?? 0,
    units: unitCount[0]?.count ?? 0,
    expenses: expenseTotal[0]?.total ?? 0,
    slaRisk: slaRisk[0]?.count ?? 0,
  };
}
