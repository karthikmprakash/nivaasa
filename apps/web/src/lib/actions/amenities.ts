"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { amenityBookings, auditLogs, memberships, notifications, payments } from "@/db/schema";
import { requireResident } from "@/lib/queries";

export async function cancelBooking(formData: FormData) {
  const ctx = await requireResident();
  const bookingId = String(formData.get("bookingId") ?? "");
  const [booking] = await db.select().from(amenityBookings).where(and(eq(amenityBookings.id, bookingId), eq(amenityBookings.unitId, ctx.unit.id))).limit(1);
  if (!booking || booking.status !== "confirmed") return;
  const startsAt = new Date(`${booking.date}T${booking.startTime}:00+05:30`);
  const hoursAway = (startsAt.getTime() - Date.now()) / 3600000;
  if (hoursAway < 0) return;
  const refundable = hoursAway >= 24 && booking.amount > 0;
  await db.update(amenityBookings).set({ status: "cancelled", paymentStatus: refundable ? "refunded" : booking.paymentStatus }).where(eq(amenityBookings.id, bookingId));
  if (refundable && booking.paymentId) {
    await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, booking.paymentId));
  }
  const admins = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["admin", "manager"])));
  if (admins.length) {
    await db.insert(notifications).values(admins.map((a) => ({
      id: crypto.randomUUID(), userId: a.userId, societyId: ctx.society.id,
      title: "Amenity booking cancelled", body: `${ctx.user.name} cancelled a booking on ${booking.date} (${booking.startTime}–${booking.endTime}). ${refundable ? "Refund initiated." : "No refund — inside 24 hours."}`,
      type: "amenity" as const, link: "/admin/amenities", createdAt: new Date(),
    })));
  }
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "amenity.booking.cancelled", entity: "booking", entityId: bookingId, metadata: { date: booking.date, refundable }, createdAt: new Date() });
  revalidatePath("/app/amenities");
  revalidatePath("/admin/amenities");
}
