import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { amenities, amenityBookings, deliveries, events, helpdeskTickets, invoices, memberships, notices, notifications, payments, pollVotes, polls, units, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unitId = session.membership.unitId;
  const societyId = session.society.id;
  const now = new Date();
  const [dueRows, pendingVisitors, noticeRows, eventRows, pollRows, myVotes, ticketRows, bookingRows, deliveryRows, unreadRows] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)`, count: count(), overdue: sql<number>`coalesce(sum(case when status='overdue' then 1 else 0 end),0)` }).from(invoices).where(and(eq(invoices.unitId, unitId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))),
    db.select().from(visitors).where(and(eq(visitors.unitId, unitId), eq(visitors.status, "pending"))).orderBy(desc(visitors.createdAt)),
    db.select().from(notices).where(and(eq(notices.societyId, societyId), or(eq(notices.audience, "all"), eq(notices.audience, "owners")))).orderBy(desc(notices.pinned), desc(notices.publishedAt)).limit(5),
    db.select().from(events).where(and(eq(events.societyId, societyId), gte(events.startAt, now))).orderBy(events.startAt).limit(3),
    db.select().from(polls).where(and(eq(polls.societyId, societyId), eq(polls.status, "active"))).orderBy(desc(polls.createdAt)).limit(3),
    db.select().from(pollVotes).where(eq(pollVotes.userId, session.user.id)),
    db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.unitId, unitId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))).orderBy(desc(helpdeskTickets.updatedAt)).limit(3),
    db.select({ booking: amenityBookings, amenity: amenities.name }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(and(eq(amenityBookings.unitId, unitId), eq(amenityBookings.status, "confirmed"), gte(amenityBookings.date, new Date().toISOString().slice(0, 10)))).orderBy(amenityBookings.date).limit(3),
    db.select().from(deliveries).where(and(eq(deliveries.unitId, unitId), inArray(deliveries.status, ["arrived", "left_at_gate"]))).orderBy(desc(deliveries.createdAt)),
    db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, session.user.id), eq(notifications.societyId, societyId), isNull(notifications.readAt))),
  ]);
  const pollIds = pollRows.map((p) => p.id);
  const voteRows = pollIds.length ? await db.select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, c: count() }).from(pollVotes).where(inArray(pollVotes.pollId, pollIds)).groupBy(pollVotes.pollId, pollVotes.optionId) : [];
  const counts: Record<string, Record<string, number>> = {};
  for (const v of voteRows) { counts[v.pollId] ??= {}; counts[v.pollId][v.optionId] = v.c; }
  const myVote = new Map(myVotes.map((v) => [v.pollId, v.optionId]));
  const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
  return NextResponse.json({
    society: session.society.name,
    unit: unit?.number,
    user: { name: session.user.name, avatarColor: session.user.avatarColor },
    dues: { total: dueRows[0]?.total ?? 0, count: dueRows[0]?.count ?? 0, overdue: dueRows[0]?.overdue ?? 0 },
    pendingVisitors,
    notices: noticeRows,
    events: eventRows,
    polls: pollRows.map((p) => ({ ...p, counts: counts[p.id] ?? {}, total: Object.values(counts[p.id] ?? {}).reduce((s, n) => s + n, 0), myVote: myVote.get(p.id) ?? null })),
    tickets: ticketRows,
    bookings: bookingRows,
    deliveries: deliveryRows,
    unread: unreadRows[0]?.c ?? 0,
  });
}
