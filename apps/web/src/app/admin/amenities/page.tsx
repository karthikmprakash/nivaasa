import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { CalendarCheck2, CalendarHeart, CheckCircle2, Clock3, Dumbbell, IndianRupee, Power, Star, Users, Waves, XCircle } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { CreateAmenityDialog } from "@/components/admin/amenity-dialog";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { amenities, amenityBookings, units, users } from "@/db/schema";
import { adminCancelBooking, toggleAmenity } from "@/lib/actions/admin";
import { formatDate, formatINR, todayISO } from "@/lib/utils";

export const metadata = { title: "Amenities" };

export const dynamic = "force-dynamic";

export default async function AdminAmenitiesPage() {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const today = todayISO();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [amenityRows, bookingRows] = await Promise.all([
    db.select().from(amenities).where(eq(amenities.societyId, societyId)).orderBy(amenities.sortOrder),
    db.select({ booking: amenityBookings, amenity: amenities.name, unit: units.number, user: users.name }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).innerJoin(units, eq(amenityBookings.unitId, units.id)).innerJoin(users, eq(amenityBookings.userId, users.id)).where(eq(amenityBookings.societyId, societyId)).orderBy(desc(amenityBookings.date)),
  ]);
  const upcoming = bookingRows.filter((b) => b.booking.status === "confirmed" && b.booking.date >= today);
  const monthBookings = bookingRows.filter((b) => b.booking.createdAt >= monthStart);
  const revenue = monthBookings.filter((b) => b.booking.paymentStatus === "paid").reduce((s, b) => s + b.booking.amount, 0);
  const activeAmenities = amenityRows.filter((a) => a.active).length;
  return (
    <div>
      <PageHeader eyebrow="Community life" title="Amenities" description="Availability, pricing, rules and utilisation. Fair access without the paper register." actions={<CreateAmenityDialog />} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Amenities" value={activeAmenities} hint={`${amenityRows.length - activeAmenities} inactive`} tone="blue" icon={<Dumbbell className="size-4" />} />
        <Stat label="Upcoming bookings" value={upcoming.length} hint="Confirmed slots" tone="pink" icon={<CalendarCheck2 className="size-4" />} />
        <Stat label="Bookings this month" value={monthBookings.length} hint="Across all facilities" icon={<CalendarHeart className="size-4" />} />
        <Stat label="Amenity revenue" value={formatINR(revenue)} hint="This month" tone="green" icon={<IndianRupee className="size-4" />} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {amenityRows.map((a) => {
          const bookings = bookingRows.filter((b) => b.booking.amenityId === a.id);
          const aRevenue = bookings.filter((b) => b.booking.paymentStatus === "paid").reduce((s, b) => s + b.booking.amount, 0);
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2"><span className={`grid size-9 place-items-center rounded-xl ${a.active ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted"}`}>{a.icon === "waves" ? <Waves className="size-4" /> : <CalendarHeart className="size-4" />}</span><div className="flex items-center gap-1.5"><Badge variant={a.active ? "success" : "neutral"}>{a.active ? "Active" : "Paused"}</Badge><form action={toggleAmenity}><input type="hidden" name="id" value={a.id} /><button className="grid size-6 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink" aria-label="Toggle amenity"><Power className="size-4" /></button></form></div></div>
              <p className="mt-2.5 text-body font-semibold text-ink">{a.name}</p><p className="text-caption text-muted">{a.location} · {a.capacity} people · {a.slotMinutes} min</p>
              <div className="mt-2 grid grid-cols-3 gap-1 border-t border-line pt-2.5 text-center"><div><p className="text-caption font-semibold text-ink">{a.price ? formatINR(a.price) : "Free"}</p><p className="text-caption text-muted">price</p></div><div><p className="text-caption font-semibold text-ink">{bookings.length}</p><p className="text-caption text-muted">bookings</p></div><div><p className="text-caption font-semibold text-ink">{formatINR(aRevenue)}</p><p className="text-caption text-muted">revenue</p></div></div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Bookings" description="Upcoming and past reservations" icon={<CalendarCheck2 className="size-4" />} action={<Link href="/app/amenities" className="text-caption font-semibold text-brand-600">Resident view</Link>} />
        <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[760px]"><thead><tr className="bg-[#fbfcff]">{["Amenity", "Home", "Resident", "Date", "Time", "Guests", "Amount", "Status", "Action"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-caption font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>
          {bookingRows.slice(0, 60).map((b) => (
            <tr key={b.booking.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5 text-caption font-semibold text-ink">{b.amenity}</td><td className="px-4 py-2.5 text-caption text-ink-soft">{b.unit}</td><td className="px-4 py-2.5 text-caption text-muted">{b.user}</td><td className="px-4 py-2.5 text-caption text-muted">{formatDate(b.booking.date)}</td><td className="px-4 py-2.5 text-caption text-muted">{b.booking.startTime}–{b.booking.endTime}</td><td className="px-4 py-2.5 text-caption text-muted">{b.booking.guests}</td><td className="px-4 py-2.5 text-caption font-semibold text-ink">{b.booking.amount ? formatINR(b.booking.amount) : "—"}</td><td className="px-4 py-2.5"><Badge variant={b.booking.status === "confirmed" ? "success" : b.booking.status === "cancelled" ? "neutral" : "outline"}>{b.booking.status}</Badge></td><td className="px-4 py-2.5">{b.booking.status === "confirmed" ? <form action={adminCancelBooking}><input type="hidden" name="id" value={b.booking.id} /><button className="text-caption font-semibold text-[#c43d4d]">Cancel</button></form> : null}</td></tr>
          ))}
        </tbody></table>{!bookingRows.length ? <EmptyState icon={<CalendarHeart className="size-6" />} title="No bookings yet" /> : null}</div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-line bg-white p-4"><p className="text-caption font-semibold text-ink">Fair-use rules</p><p className="mt-1 text-caption leading-relaxed text-muted">2 active slots per amenity per household per day. 24-hour cancellation window. Committee can pause any amenity with one click.</p></div>
        <div className="rounded-[18px] border border-line bg-white p-4"><p className="text-caption font-semibold text-ink">Maintenance blackouts</p><p className="mt-1 text-caption leading-relaxed text-muted">Pause an amenity while work is underway. Existing bookings remain visible and can be cancelled with a refund.</p></div>
        <div className="rounded-[18px] border border-line bg-white p-4"><p className="text-caption font-semibold text-ink">Revenue</p><p className="mt-1 text-caption leading-relaxed text-muted">Paid amenity charges flow into payments and are tagged separately from maintenance in reports.</p></div>
      </div>
    </div>
  );
}
