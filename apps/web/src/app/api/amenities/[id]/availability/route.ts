import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { communityTimeNow } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";
import { db } from "@/db";
import { amenities, amenityBookings } from "@/db/schema";
import { getSession } from "@/lib/auth";

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(mins: number) {
  const h = Math.floor((mins % (24 * 60)) / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? todayISO();
  const [amenity] = await db.select().from(amenities).where(and(eq(amenities.id, id), eq(amenities.societyId, session.membership.societyId))).limit(1);
  if (!amenity) return NextResponse.json({ error: "Amenity not found" }, { status: 404 });
  const booked = await db.select().from(amenityBookings).where(and(eq(amenityBookings.amenityId, id), eq(amenityBookings.date, date), inArray(amenityBookings.status, ["confirmed", "completed"])));
  const nowTime = date === todayISO() && amenity.slotMinutes < 1440 ? communityTimeNow() : null;

  if (amenity.slotMinutes >= 1440) {
    return NextResponse.json({ slots: [{ start: amenity.openTime, end: amenity.closeTime, available: booked.length === 0, label: "Full day · check-in 12 PM" }] });
  }
  const open = toMinutes(amenity.openTime);
  const close = toMinutes(amenity.closeTime);
  const slots: { start: string; end: string; available: boolean; label: string }[] = [];
  for (let t = open; t + amenity.slotMinutes <= close; t += amenity.slotMinutes) {
    const start = toTime(t);
    const end = toTime(t + amenity.slotMinutes);
    const conflict = booked.some((b) => toMinutes(b.startTime) < t + amenity.slotMinutes && toMinutes(b.endTime) > t);
    slots.push({ start, end, available: !conflict && (!nowTime || start > nowTime), label: `${start} – ${end}` });
  }
  return NextResponse.json({ slots, booked: booked.map((b) => ({ start: b.startTime, end: b.endTime })) });
}
