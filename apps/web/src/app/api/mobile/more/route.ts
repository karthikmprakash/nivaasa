import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { amenities, amenityBookings, documents, helpdeskTickets, memberships, notifications, units, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { maskPhone } from "@/lib/mask";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [tickets, amenityRows, bookingRows, residentRows, documentRows, notifRows] = await Promise.all([
    db.select().from(helpdeskTickets).where(eq(helpdeskTickets.unitId, session.membership.unitId ?? "")).orderBy(desc(helpdeskTickets.createdAt)).limit(20),
    db.select().from(amenities).where(and(eq(amenities.societyId, session.society.id), eq(amenities.active, true))).orderBy(amenities.sortOrder),
    db.select({ booking: amenityBookings, amenity: amenities.name }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(eq(amenityBookings.unitId, session.membership.unitId ?? "")).orderBy(desc(amenityBookings.date)).limit(10),
    db.select({ name: users.name, phone: users.phone, role: memberships.role, color: users.avatarColor, unit: units.number }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).leftJoin(units, eq(memberships.unitId, units.id)).where(and(eq(memberships.societyId, session.society.id), eq(memberships.status, "active"), eq(memberships.directoryVisible, true), inArray(memberships.role, ["owner", "tenant", "committee"]))).orderBy(units.number),
    db.select().from(documents).where(and(eq(documents.societyId, session.society.id), eq(documents.visibility, "all"))).orderBy(desc(documents.createdAt)),
    db.select().from(notifications).where(and(eq(notifications.userId, session.user.id), eq(notifications.societyId, session.society.id))).orderBy(desc(notifications.createdAt)).limit(20),
  ]);
  return NextResponse.json({
    tickets,
    amenities: amenityRows,
    bookings: bookingRows,
    directory: residentRows.map((r) => ({ name: r.name, role: r.role, unit: r.unit, color: r.color, phone: maskPhone(r.phone) })),
    documents: documentRows,
    notifications: notifRows,
    profile: { name: session.user.name, email: session.user.email, phone: session.user.phone, role: session.membership.role, designation: session.membership.designation, unit: session.unit?.number, joinedAt: session.membership.joinedAt },
    society: { name: session.society.name, city: session.society.city, address: session.society.address },
  });
}
