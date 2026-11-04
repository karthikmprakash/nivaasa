import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { communityDayStart, communityTimeNow } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";
import { db } from "@/db";
import { amenities, amenityBookings, auditLogs, memberships, notifications, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({
  amenityId: z.string(),
  date: z.string(),
  startTime: z.string(),
  guests: z.number().int().min(0).max(200).default(0),
  notes: z.string().max(400).optional(),
});

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(t: string, mins: number) {
  const total = toMinutes(t) + mins;
  return `${String(Math.floor((total % (24 * 60)) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Only residents can book amenities." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking request." }, { status: 400 });
  const { amenityId, date, startTime, guests, notes } = parsed.data;
  const [amenity] = await db.select().from(amenities).where(and(eq(amenities.id, amenityId), eq(amenities.societyId, session.membership.societyId), eq(amenities.active, true))).limit(1);
  if (!amenity) return NextResponse.json({ error: "Amenity not found." }, { status: 404 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !communityDayStart(date)) return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  if (date < todayISO()) return NextResponse.json({ error: "Choose today or a future date." }, { status: 400 });
  if (guests > amenity.capacity) return NextResponse.json({ error: `This space holds up to ${amenity.capacity} people.` }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(startTime)) return NextResponse.json({ error: "Choose a valid start time." }, { status: 400 });
  const fullDay = amenity.slotMinutes >= 1440;
  const startMinutes = toMinutes(startTime);
  const openMinutes = toMinutes(amenity.openTime);
  const closeMinutes = toMinutes(amenity.closeTime);
  if (fullDay) {
    if (startTime !== amenity.openTime) return NextResponse.json({ error: `Full-day bookings start at ${amenity.openTime}.` }, { status: 400 });
  } else {
    if (!Number.isFinite(startMinutes) || startMinutes < openMinutes || startMinutes >= closeMinutes) {
      return NextResponse.json({ error: `Choose a time between ${amenity.openTime} and ${amenity.closeTime}.` }, { status: 400 });
    }
    if (date === todayISO() && startTime <= communityTimeNow()) {
      return NextResponse.json({ error: "That time has already passed. Choose a later slot." }, { status: 400 });
    }
    if ((startMinutes - openMinutes) % amenity.slotMinutes !== 0) return NextResponse.json({ error: "Choose one of the available slots." }, { status: 400 });
    if (startMinutes + amenity.slotMinutes > closeMinutes) return NextResponse.json({ error: "That slot ends after the amenity closes." }, { status: 400 });
  }
  const endTime = fullDay ? amenity.closeTime : addMinutes(startTime, amenity.slotMinutes);
  const sameDay = await db.select().from(amenityBookings).where(and(eq(amenityBookings.amenityId, amenityId), eq(amenityBookings.date, date), inArray(amenityBookings.status, ["confirmed", "completed"])));
  const conflict = amenity.slotMinutes >= 1440
    ? sameDay.length > 0
    : sameDay.some((b) => toMinutes(b.startTime) < toMinutes(endTime) && toMinutes(b.endTime) > toMinutes(startTime));
  if (conflict) return NextResponse.json({ error: "That slot was just taken. Please choose another." }, { status: 409 });
  const householdToday = await db.select({ count: sql<number>`count(*)` }).from(amenityBookings).where(and(eq(amenityBookings.amenityId, amenityId), eq(amenityBookings.date, date), eq(amenityBookings.unitId, session.membership.unitId), inArray(amenityBookings.status, ["confirmed"])));
  if ((householdToday[0]?.count ?? 0) >= 2) return NextResponse.json({ error: "Your household already has 2 bookings for this amenity today." }, { status: 409 });

  const id = crypto.randomUUID();
  const now = new Date();
  const amount = amenity.price;
  const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(payments).where(eq(payments.societyId, session.membership.societyId));
  let paymentId: string | null = null;
  if (amount > 0) {
    paymentId = crypto.randomUUID();
    await db.insert(payments).values({
      id: paymentId, societyId: session.membership.societyId, unitId: session.membership.unitId, invoiceId: null,
      userId: session.user.id, receiptNo: `RCPT-${todayISO().slice(0, 4)}-${String((c ?? 0) + 1).padStart(5, "0")}`,
      kind: "amenity", amount, method: "upi", reference: `BOOK/${id.slice(0, 8).toUpperCase()}`, status: "success",
      note: `${amenity.name} · ${date} ${startTime}–${endTime}`, paidAt: now, createdAt: now,
    });
  }
  await db.insert(amenityBookings).values({
    id, societyId: session.membership.societyId, amenityId, unitId: session.membership.unitId, userId: session.user.id,
    date, startTime, endTime, guests, amount, paymentId, status: "confirmed", paymentStatus: amount > 0 ? "paid" : "not_required",
    notes: notes || null, createdAt: now,
  });
  const admins = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, session.membership.societyId), eq(memberships.status, "active"), inArray(memberships.role, ["admin", "manager"])));
  if (admins.length) {
    await db.insert(notifications).values(admins.map((a) => ({
      id: crypto.randomUUID(), userId: a.userId, societyId: session.membership!.societyId,
      title: "New amenity booking", body: `${session.user.name} booked ${amenity.name} on ${date}, ${startTime}–${endTime}.`, type: "amenity" as const, link: "/admin/amenities", createdAt: now,
    })));
  }
  await db.insert(notifications).values({
    id: crypto.randomUUID(), userId: session.user.id, societyId: session.membership.societyId,
    title: "Amenity booked", body: `${amenity.name} is confirmed for ${date}, ${startTime}–${endTime}. ${amount > 0 ? "Payment receipt is in your payments." : "No payment required."}`, type: "amenity", link: "/app/amenities", createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.membership.societyId, actorId: session.user.id, actorName: session.user.name, action: "amenity.booked", entity: "booking", entityId: id, metadata: { amenity: amenity.name, date, startTime, amount }, createdAt: now });
  return NextResponse.json({ ok: true, bookingId: id, paymentId, amount });
}
