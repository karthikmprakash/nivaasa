import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import {
  Activity, ArrowRight, BedDouble, CalendarCheck2, CalendarHeart, Clock3, Dumbbell, Flower2,
  Laptop, MapPin, PartyPopper, Sparkles, Trophy, Users, Waves, Wallet,
} from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { BookAmenityButton } from "@/components/app/booking-dialog";
import { CancelBookingButton } from "@/components/app/cancel-booking";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { amenities, amenityBookings } from "@/db/schema";
import { formatDate, formatINR, formatTime, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Amenities" };

export const dynamic = "force-dynamic";

const iconMap: Record<string, typeof Waves> = { waves: Waves, dumbbell: Dumbbell, trophy: Trophy, activity: Activity, bed: BedDouble, flower: Flower2, laptop: Laptop, party: PartyPopper };
const categoryOrder = ["Wellness", "Sport", "Celebrate & stay", "Work"];
function categoryFor(name: string) {
  if (/pool|fitness|yoga/i.test(name)) return "Wellness";
  if (/tennis|badminton|basketball/i.test(name)) return "Sport";
  if (/clubhouse|guest/i.test(name)) return "Celebrate & stay";
  return "Work";
}
const gradients = ["from-[#dbe7ff] to-[#eef4ff] text-brand-600", "from-[#d8f1f8] to-[#eefafd] text-[#2b7f95]", "from-[#fde8f0] to-[#fff4f8] text-blush-500", "from-[#e6f4ea] to-[#f4fbf6] text-mint-600", "from-[#f3edff] to-[#faf7ff] text-[#6a54c8]"];

export default async function AmenitiesPage() {
  const ctx = await requireResident();
  const today = todayISO();
  const [list, bookings] = await Promise.all([
    db.select().from(amenities).where(and(eq(amenities.societyId, ctx.society.id), eq(amenities.active, true))).orderBy(asc(amenities.sortOrder)),
    db.select({ booking: amenityBookings, amenity: amenities }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(eq(amenityBookings.unitId, ctx.unit.id)).orderBy(desc(amenityBookings.date)),
  ]);
  const upcoming = bookings.filter((b) => b.booking.status === "confirmed" && b.booking.date >= today);
  const past = bookings.filter((b) => b.booking.status !== "confirmed" || b.booking.date < today);
  const grouped = categoryOrder.map((c) => ({ category: c, items: list.filter((a) => categoryFor(a.name) === c) })).filter((g) => g.items.length);
  const spend = bookings.filter((b) => b.booking.paymentStatus === "paid").reduce((s, b) => s + b.booking.amount, 0);

  return (
    <div>
      <PageHeader eyebrow="Your community club" title="Amenities" description="Book the pool, the court or the party hall in seconds. Live availability, clear rules and payments built in." actions={<a href="#amenities-list" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white hover:bg-brand-700"><CalendarHeart className="size-4" /> Book an amenity</a>} />

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Bookings" value={upcoming.length} hint="Upcoming" tone="pink" icon={<CalendarCheck2 className="size-4" />} />
        <Stat label="Amenities" value={list.length} hint="Available to you" tone="blue" icon={<Sparkles className="size-4" />} />
        <Stat label="Hours this month" value="6.5" hint="Across 4 visits" icon={<Clock3 className="size-4" />} />
        <Stat label="Spent" value={formatINR(spend)} hint="Amenity charges" tone="green" icon={<Wallet className="size-4" />} />
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-line bg-white shadow-soft">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><CalendarHeart className="size-4" /></span>
            <div><p className="text-[13px] font-semibold text-ink">Your next booking</p>{upcoming[0] ? <p className="mt-0.5 text-[10.5px] text-muted">{upcoming[0].amenity.name} · {formatDate(upcoming[0].booking.date)} · {upcoming[0].booking.startTime}–{upcoming[0].booking.endTime}</p> : <p className="mt-0.5 text-[10.5px] text-muted">Nothing booked yet. The pool is lovely this time of year.</p>}</div>
          </div>
          <div className="flex items-center gap-3">
            {upcoming[0]?.booking.paymentId ? <Link href={`/app/payments/receipts/${upcoming[0].booking.paymentId}`} className="text-[10px] font-semibold text-brand-600">View receipt</Link> : null}
            <Link href="#bookings" className="rounded-full border border-line px-3.5 py-2 text-[10.5px] font-semibold text-ink-soft">My bookings</Link>
          </div>
        </div>
      </div>

      <div id="amenities-list" className="mt-8 space-y-8">
        {grouped.map((group, gi) => (
          <section key={group.category}>
            <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">{group.category}</p><h2 className="mt-1 text-[19px] font-semibold tracking-[-0.02em] text-ink">{group.category === "Wellness" ? "Move, breathe, reset" : group.category === "Sport" ? "A little friendly competition" : group.category === "Celebrate & stay" ? "For the moments worth marking" : "A change of scenery"}</h2></div></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((a) => {
                const Icon = iconMap[a.icon] ?? Sparkles;
                return (
                  <Card key={a.id} className="group overflow-hidden">
                    <div className={`relative h-28 bg-gradient-to-br ${gradients[list.indexOf(a) % gradients.length]}`}>
                      <div className="absolute inset-0 dot-paper opacity-30" />
                      <Icon className="absolute -bottom-3 right-3 size-24 opacity-20" strokeWidth={1.2} />
                      <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[8.5px] font-semibold text-ink-soft backdrop-blur"><MapPin className="size-2.5" /> {a.location ?? "Clubhouse"}</div>
                      <div className="absolute bottom-3 left-4"><p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{a.name}</p></div>
                    </div>
                    <div className="p-4">
                      <p className="line-clamp-2 text-[10.5px] leading-relaxed text-muted">{a.description}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <Badge variant="outline"><Users className="size-2.5" /> {a.capacity} people</Badge>
                        <Badge variant="outline"><Clock3 className="size-2.5" /> {a.slotMinutes >= 1440 ? "Per night" : `${a.slotMinutes} min`}</Badge>
                        {a.price ? <Badge variant="pink">{formatINR(a.price)}</Badge> : <Badge variant="success">Free</Badge>}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="text-[9px] text-muted">{a.openTime} – {a.closeTime}</span>
                        <BookAmenityButton amenity={a} label="Check slots" variant="outline" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div id="bookings" className="mt-10 grid gap-5 scroll-mt-24 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="My bookings" description="Upcoming visits and booking history" icon={<CalendarCheck2 className="size-4" />} />
          <div className="border-t border-line">
            {upcoming.map(({ booking: b, amenity }) => (
              <div key={b.id} className="flex flex-col gap-2 border-b border-line/70 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><CalendarHeart className="size-4" /></span><div><p className="text-[11.5px] font-semibold text-ink">{amenity.name}</p><p className="text-[9.5px] text-muted">{formatDate(b.date)} · {b.startTime}–{b.endTime} · {b.guests} guests</p></div></div>
                <div className="flex items-center gap-2"><Badge variant="success">Confirmed</Badge>{b.amount ? <span className="text-[10px] font-semibold text-ink">{formatINR(b.amount)}</span> : null}<CancelBookingButton bookingId={b.id} refundable={new Date(`${b.date}T${b.startTime}:00`).getTime() - Date.now() >= 24 * 3600 * 1000} /></div>
              </div>
            ))}
            {!upcoming.length ? <EmptyState icon={<CalendarHeart className="size-6" />} title="No upcoming bookings" description="Pick something from above and make a little time for yourself." className="py-8" /> : null}
            {past.slice(0, 4).map(({ booking: b, amenity }) => (
              <div key={b.id} className="flex items-center justify-between gap-2 border-b border-line/70 px-5 py-3 opacity-70 last:border-0">
                <div><p className="text-[10.5px] font-medium text-ink">{amenity.name}</p><p className="text-[9px] text-muted">{formatDate(b.date)} · {b.startTime}</p></div>
                <Badge variant={b.status === "cancelled" ? "neutral" : "blue"}>{b.status === "cancelled" ? "Cancelled" : "Completed"}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <aside className="space-y-4">
          <div className="rounded-[20px] bg-gradient-to-br from-blush-50 to-brand-50 p-5">
            <p className="text-[12px] font-semibold text-ink">Fair use, by design</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">Every household can hold two slots per amenity per day. Cancel at least 24 hours ahead for a full refund. Defaulters and those with unpaid dues may be restricted — the committee sets the policy.</p>
          </div>
          <div className="rounded-[20px] border border-line bg-white p-5">
            <p className="text-[11.5px] font-semibold text-ink">Clubhouse inventory</p>
            <p className="mt-1 text-[10px] text-muted">Chairs, tables, projectors and sports equipment are tracked digitally.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">{[["Chairs", "48"], ["Tables", "12"], ["Projector", "1"]].map(([l, v]) => <div key={l} className="rounded-lg bg-canvas px-2 py-2 text-center"><p className="text-[13px] font-semibold text-ink">{v}</p><p className="text-[8px] text-muted">{l}</p></div>)}</div>
          </div>
          <div className="rounded-[20px] border border-line bg-[#fbfcff] p-5">
            <p className="text-[11.5px] font-semibold text-ink">Need the full clubhouse?</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">For weddings, large functions or multi-day events, raise a request and the committee will help plan it.</p>
            <Link href="/app/helpdesk/new" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">Request a booking <ArrowRight className="size-3" /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
