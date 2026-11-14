import { NextResponse } from "next/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { amenities, amenityBookings, deliveries, documents, familyMembers, helpdeskTickets, memberships, moveRequests, notifications, pets, staff, towers, units, users, vehicles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { maskPhone } from "@/lib/mask";
import { isOwnerAudience } from "@/lib/community-access";
import { getSocietyContacts } from "@/lib/society-contacts";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const visibility: ("all" | "owners" | "committee")[] = ["all"];
  if (isOwnerAudience(session.membership.role)) visibility.push("owners");
  if (["admin", "manager", "committee"].includes(session.membership.role)) visibility.push("committee");
  const [tickets, amenityRows, bookingRows, residentRows, documentRows, notifRows, familyRows, vehicleRows, petRows, helpRows, moves] = await Promise.all([
    db.select().from(helpdeskTickets).where(eq(helpdeskTickets.unitId, session.membership.unitId ?? "")).orderBy(desc(helpdeskTickets.createdAt)).limit(20),
    db.select().from(amenities).where(and(eq(amenities.societyId, session.society.id), eq(amenities.active, true))).orderBy(amenities.sortOrder),
    db.select({ booking: amenityBookings, amenity: amenities.name }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(eq(amenityBookings.unitId, session.membership.unitId ?? "")).orderBy(desc(amenityBookings.date)).limit(10),
    db.select({ name: users.name, phone: users.phone, role: memberships.role, color: users.avatarColor, designation: memberships.designation, towerName: towers.name, towerCode: towers.code, unit: units.number, unitId: memberships.unitId }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).leftJoin(units, eq(memberships.unitId, units.id)).leftJoin(towers, eq(units.towerId, towers.id)).where(and(eq(memberships.societyId, session.society.id), eq(memberships.status, "active"), eq(memberships.directoryVisible, true), inArray(memberships.role, ["owner", "tenant", "committee"]))).orderBy(units.number),
    db.select().from(documents).where(and(eq(documents.societyId, session.society.id), inArray(documents.visibility, visibility))).orderBy(desc(documents.createdAt)),
    db.select().from(notifications).where(and(eq(notifications.userId, session.user.id), eq(notifications.societyId, session.society.id))).orderBy(desc(notifications.createdAt)).limit(20),
    db.select({ member: familyMembers }).from(familyMembers).innerJoin(memberships, eq(familyMembers.membershipId, memberships.id)).where(and(eq(memberships.unitId, session.membership.unitId ?? ""), eq(memberships.societyId, session.society.id), eq(memberships.status, "active"))),
    db.select().from(vehicles).where(and(eq(vehicles.unitId, session.membership.unitId ?? ""), eq(vehicles.societyId, session.society.id))),
    db.select().from(pets).where(and(eq(pets.unitId, session.membership.unitId ?? ""), eq(pets.societyId, session.society.id))),
    db.select().from(staff).where(and(eq(staff.unitId, session.membership.unitId ?? ""), eq(staff.societyId, session.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true))),
    db.select().from(moveRequests).where(and(eq(moveRequests.unitId, session.membership.unitId ?? ""), eq(moveRequests.societyId, session.society.id))).orderBy(desc(moveRequests.createdAt)),
  ]);
  const visibleUnits = residentRows.map(row => row.unitId).filter((id): id is string => !!id);
  const [directoryPets, directoryVehicles, directoryHelp, contacts, deliveryRows, unreadRows] = await Promise.all([
    visibleUnits.length ? db.select({ id: pets.id, name: pets.name, species: pets.species, unit: units.number }).from(pets).innerJoin(units, eq(pets.unitId, units.id)).where(and(eq(pets.societyId, session.society.id), inArray(pets.unitId, visibleUnits))) : [],
    visibleUnits.length ? db.select({ id: vehicles.id, registrationNo: vehicles.registrationNo, make: vehicles.make, model: vehicles.model, unit: units.number }).from(vehicles).innerJoin(units, eq(vehicles.unitId, units.id)).where(and(eq(vehicles.societyId, session.society.id), inArray(vehicles.unitId, visibleUnits))) : [],
    visibleUnits.length ? db.select({ id: staff.id, name: staff.name, role: staff.role, unit: units.number, policeVerified: staff.policeVerified }).from(staff).innerJoin(units, eq(staff.unitId, units.id)).where(and(eq(staff.societyId, session.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true), inArray(staff.unitId, visibleUnits))) : [],
    getSocietyContacts(session.society.id),
    db.select().from(deliveries).where(and(eq(deliveries.unitId, session.membership.unitId ?? ""), eq(deliveries.societyId, session.society.id))).orderBy(desc(deliveries.createdAt)),
    db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, session.user.id), eq(notifications.societyId, session.society.id), isNull(notifications.readAt))),
  ]);
  return NextResponse.json({
    tickets,
    amenities: amenityRows,
    bookings: bookingRows,
    directory: residentRows.map((r) => ({ name: r.name, role: r.role, unit: r.unit, color: r.color, designation: r.designation, towerName: r.towerName, towerCode: r.towerCode, phone: maskPhone(r.phone) })),
    directoryPets, directoryVehicles, directoryHelp, contacts, deliveries: deliveryRows,
    documents: documentRows,
    notifications: notifRows,
    unread: unreadRows[0]?.c ?? 0,
    profile: { name: session.user.name, email: session.user.email, phone: session.user.phone, role: session.membership.role, designation: session.membership.designation, unit: session.unit?.number, joinedAt: session.membership.joinedAt, directoryVisible: session.membership.directoryVisible, notificationPrefs: session.membership.notificationPrefs },
    household: { unit: session.unit, family: familyRows.map(row => row.member), vehicles: vehicleRows, pets: petRows, help: helpRows, moves },
    society: { name: session.society.name, city: session.society.city, address: session.society.address },
  });
}
