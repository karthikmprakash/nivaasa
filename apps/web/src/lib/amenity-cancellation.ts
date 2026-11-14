import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { amenityBookings, auditLogs, memberships, notifications, payments } from "@/db/schema";
import type { ResidentContext } from "@/lib/queries";

export function cancelResidentBooking(ctx: ResidentContext, id: string) {
  const result = db.transaction((tx) => {
    const booking = tx.select().from(amenityBookings).where(and(
      eq(amenityBookings.id, id), eq(amenityBookings.unitId, ctx.unit.id), eq(amenityBookings.societyId, ctx.society.id),
    )).get();
    if (!booking) return { status: 404, error: "Booking not found." } as const;
    const hoursAway = (new Date(`${booking.date}T${booking.startTime}:00+05:30`).getTime() - Date.now()) / 3_600_000;
    if (booking.status !== "confirmed" || !Number.isFinite(hoursAway) || hoursAway <= 0) {
      return { status: 409, error: "Only upcoming confirmed bookings can be cancelled." } as const;
    }

    const refundable = hoursAway >= 24 && booking.amount > 0;
    tx.update(amenityBookings).set({ status: "cancelled", paymentStatus: refundable ? "refunded" : booking.paymentStatus })
      .where(eq(amenityBookings.id, id)).run();
    if (refundable && booking.paymentId) {
      tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, booking.paymentId)).run();
    }
    const admins = tx.select({ userId: memberships.userId }).from(memberships).where(and(
      eq(memberships.societyId, ctx.society.id), eq(memberships.status, "active"), inArray(memberships.role, ["admin", "manager"]),
    )).all();
    if (admins.length) {
      const refundNote = refundable ? "Refund recorded." : booking.amount > 0 ? "No refund within 24 hours." : "This was a free booking.";
      tx.insert(notifications).values(admins.map((admin) => ({
        id: crypto.randomUUID(), userId: admin.userId, societyId: ctx.society.id,
        title: "Amenity booking cancelled",
        body: `${ctx.user.name} cancelled a booking on ${booking.date} (${booking.startTime}–${booking.endTime}). ${refundNote}`,
        type: "amenity" as const, link: "/admin/amenities", createdAt: new Date(),
      }))).run();
    }
    tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
      action: "amenity.booking.cancelled", entity: "booking", entityId: id,
      metadata: { date: booking.date, refundable }, createdAt: new Date(),
    }).run();
    return { ok: true, refundable } as const;
  }, { behavior: "immediate" });

  if ("ok" in result) {
    revalidatePath("/app/amenities");
    revalidatePath("/admin/amenities");
  }
  return result;
}
