import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarHeart, CheckCircle2, ChevronRight, Clock3, FileText, House, Package, ShieldAlert, UserRoundPlus, Users, Vote, Wallet, Wrench } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, buttonClass, type BadgeVariant } from "@/components/ui/primitives";
import { VisitorApprovalCard } from "@/components/app/visitor-approval-card";
import { getResidentHomeData, requireResident } from "@/lib/queries";
import { formatDate, formatINR, formatTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryTone: Record<string, BadgeVariant> = { general: "neutral", maintenance: "warning", security: "blue", event: "pink", finance: "success", emergency: "danger" };
const services = [
  { href: "/app/helpdesk/new", label: "Raise a request", icon: Wrench },
  { href: "/app/amenities", label: "Book an amenity", icon: CalendarHeart },
  { href: "/app/payments", label: "Payments", icon: Wallet },
  { href: "/app/directory", label: "Directory", icon: Users },
  { href: "/app/documents", label: "Documents", icon: FileText },
  { href: "/app/my-home", label: "My household", icon: House },
];

export default async function ResidentHomePage() {
  const ctx = await requireResident();
  const data = await getResidentHomeData(ctx);
  const now = new Date();
  const hour = Number(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const activePoll = data.polls.find((poll) => !poll.endsAt || new Date(poll.endsAt) > now);
  const hasDues = data.dues.total > 0;

  return <div>
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-title font-semibold tracking-[-0.03em] sm:text-[30px]">{greeting}, {ctx.user.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-body text-muted">{now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" })}<span className="mx-2 text-line-strong">/</span>Home {ctx.unit.number}</p>
      </div>
      <Link href="/app/visitors/new" className={buttonClass("primary")}><UserRoundPlus aria-hidden="true" className="size-[18px]" /> Pre-approve a visitor</Link>
    </div>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_336px]">
      <section aria-labelledby="gate-heading" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><h2 id="gate-heading" className="text-section font-semibold">At your gate</h2>{data.pendingVisitors.length ? <Badge variant="warning" dot>{data.pendingVisitors.length} waiting</Badge> : null}</div>
          <Link href="/app/visitors" className="inline-flex min-h-9 items-center gap-1 text-caption font-semibold text-brand-700">All visitors <ChevronRight className="size-4" /></Link>
        </div>
        {data.pendingVisitors.length ? <div className="grid gap-3 2xl:grid-cols-2">{data.pendingVisitors.map((v) => <VisitorApprovalCard key={v.id} visitor={v} />)}</div> :
          <div className="flex items-center gap-3 rounded-panel border border-line bg-white p-5"><CheckCircle2 className="size-6 shrink-0 text-mint-600" /><div><p className="text-body font-semibold">No visitors waiting</p><p className="mt-1 text-caption text-muted">Approval requests will appear here when someone arrives.</p></div></div>}
      </section>

      <aside className="contents xl:col-start-2 xl:row-span-2 xl:block xl:space-y-5" aria-label="Your home summary">
        <div className="order-1 rounded-panel border border-brand-200 bg-brand-50/70 p-5 xl:order-none">
          <div className="flex items-center justify-between gap-2"><h2 className="text-body font-medium text-ink-soft">Maintenance & dues</h2><Wallet aria-hidden="true" className="size-[18px] text-brand-600" /></div>
          <p className="mt-3 text-[36px] font-semibold leading-tight tracking-[-0.03em] tabular-nums text-ink">{formatINR(data.dues.total)}</p>
          <p className="mt-1 text-caption text-ink-soft">{hasDues ? `${data.dues.count} open ${data.dues.count === 1 ? "invoice" : "invoices"}` : "All paid. You're up to date."}</p>
          {data.dues.overdue > 0 ? <p className="mt-3 inline-flex items-center gap-1.5 text-caption font-medium text-amber-ink"><Clock3 className="size-4" /> {data.dues.overdue} {data.dues.overdue === 1 ? "invoice is" : "invoices are"} overdue</p> : null}
          <Link href="/app/payments" className={`${buttonClass(hasDues ? "primary" : "outline")} mt-4 w-full`}>{hasDues ? "Review & pay" : "View payments"}<ArrowRight className="size-4" /></Link>
          <Link href="/app/payments?tab=history" className="mt-3 flex min-h-9 items-center justify-center text-caption font-medium text-brand-700 hover:underline">Payment history & receipts</Link>
        </div>
        <Card className="order-3 xl:order-none">
          <CardHeader title={`Home ${ctx.unit.number}`} description={`${ctx.unit.unitType} · ${ctx.unit.areaSqft} sq ft`} action={<Link href="/app/my-home" className="text-caption font-semibold text-brand-700">Manage</Link>} />
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line py-4">
            {[{ label: "Family", count: data.household.family, hash: "family" }, { label: "Vehicles", count: data.household.vehicles, hash: "vehicles" }, { label: "Pets", count: data.household.pets, hash: "pets" }].map((item) => <Link key={item.hash} href={`/app/my-home#${item.hash}`} className="text-center hover:text-brand-700"><p className="text-xl font-semibold tabular-nums">{item.count}</p><p className="mt-1 text-caption text-muted">{item.label}</p></Link>)}
          </div>
        </Card>
        <Card className="order-4 xl:order-none">
          <CardHeader title="Deliveries" action={<Link href="/app/deliveries" className="text-caption font-semibold text-brand-700">View all</Link>} />
          <div className="divide-y divide-line border-t border-line">
            {data.deliveries.length ? data.deliveries.slice(0, 3).map((d) => <Link key={d.id} href="/app/deliveries" className="flex items-start gap-3 px-5 py-4 hover:bg-canvas/50"><Package aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-muted" /><div className="min-w-0 flex-1"><p className="text-body font-semibold">{d.company}</p><p className="mt-1 text-caption text-muted">{d.status === "left_at_gate" ? "Ready to collect at the gate" : "Waiting at the gate"}</p>{d.otp ? <p className="mt-1 text-caption text-ink-soft">Pickup code <span className="font-semibold tabular-nums tracking-wider">{d.otp}</span></p> : null}</div><ChevronRight className="mt-1 size-4 shrink-0 text-muted" /></Link>) : <p className="px-5 py-5 text-body text-muted">No deliveries waiting.</p>}
          </div>
        </Card>
        <Link href="/app/emergency" className="order-5 group flex min-h-16 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-[#d5a8b0]"><ShieldAlert className="size-5 shrink-0 text-[#b83244]" /><div className="flex-1"><p className="text-body font-semibold">Emergency & safety</p><p className="text-caption text-muted">Alert the guard or find a contact</p></div><ChevronRight className="size-4 text-muted" /></Link>
      </aside>

      <div className="order-2 min-w-0 space-y-6 xl:order-none xl:col-start-1">
        <section aria-label="Everyday services" className="grid grid-cols-2 gap-2 rounded-panel border border-line bg-white p-3 sm:grid-cols-3 sm:gap-2.5 sm:p-4">
          {services.map((service) => <Link key={service.href} href={service.href} className="group flex min-h-12 min-w-0 items-center gap-2 rounded-control border border-transparent bg-canvas/70 px-2.5 text-body font-medium text-ink-soft transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:gap-2.5 sm:px-3"><service.icon aria-hidden="true" className="size-[18px] shrink-0 text-muted group-hover:text-brand-600" /><span className="min-w-0 leading-tight">{service.label}</span></Link>)}
        </section>
        <Card>
          <CardHeader title="Community updates" description="Notices from your committee" action={<Link href="/app/community" className="inline-flex items-center gap-1 text-caption font-semibold text-brand-700">View all <ArrowRight className="size-4" /></Link>} />
          <div className="divide-y divide-line border-t border-line">
            {data.notices.map((notice) => <Link key={notice.id} href={`/app/community/notices/${notice.id}`} className="group block px-5 py-4 transition-colors hover:bg-canvas/50 sm:px-6"><div className="flex flex-wrap items-center gap-2"><Badge variant={categoryTone[notice.category] ?? "neutral"}><span className="capitalize">{notice.category}</span></Badge>{notice.pinned ? <span className="text-caption font-medium text-ink-soft">Pinned</span> : null}<span className="ml-auto text-caption text-muted">{timeAgo(notice.publishedAt)}</span></div><h3 className="mt-2 text-body font-semibold leading-relaxed group-hover:text-brand-700">{notice.title}</h3><p className="mt-1 line-clamp-2 text-body leading-relaxed text-muted">{notice.body.replace(/\n/g, " ")}</p></Link>)}
            {!data.notices.length ? <EmptyState title="No notices yet" description="Updates from your committee will appear here." /> : null}
          </div>
        </Card>
        <div className="grid items-start gap-5 2xl:grid-cols-2">
          <Card>
            <CardHeader title="Your requests" action={<Link href="/app/helpdesk" className="text-caption font-semibold text-brand-700">View all</Link>} />
            <div className="divide-y divide-line border-t border-line">{data.openTickets.length ? data.openTickets.map((ticket) => <Link key={ticket.id} href={`/app/helpdesk/${ticket.id}`} className="block px-5 py-4 hover:bg-canvas/50"><p className="text-body font-semibold">{ticket.subject}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-caption text-muted">{ticket.category} · {timeAgo(ticket.updatedAt)}</span><Badge variant="neutral"><span className="capitalize">{ticket.status.replaceAll("_", " ")}</span></Badge></div></Link>) : <EmptyState title="No open requests" description="Need something fixed? Raise a request to the community team." action={<Link href="/app/helpdesk/new" className={buttonClass("outline", "sm")}>Raise a request</Link>} className="py-7" />}</div>
          </Card>
          <Card>
            <CardHeader title="Coming up" action={<Link href="/app/community?tab=events" className="text-caption font-semibold text-brand-700">All events</Link>} />
            <div className="divide-y divide-line border-t border-line">{data.events.slice(0, 2).map((event) => <Link key={event.id} href="/app/community?tab=events" className="flex items-start gap-3 px-5 py-4 hover:bg-canvas/50"><div className="w-10 shrink-0 rounded-lg border border-line py-1 text-center"><p className="text-caption text-muted">{formatDate(event.startAt, { month: "short" })}</p><p className="text-lg font-semibold tabular-nums">{formatDate(event.startAt, { day: "numeric" })}</p></div><div className="min-w-0"><p className="text-body font-semibold">{event.title}</p><p className="mt-1 text-caption text-muted">{formatTime(event.startAt)} · {event.location}</p></div></Link>)}{data.upcomingBookings.map(({ booking, amenity }) => <Link key={booking.id} href="/app/amenities#bookings" className="flex items-start gap-3 px-5 py-4 hover:bg-canvas/50"><CalendarDays className="mt-1 size-5 shrink-0 text-muted" /><div><p className="text-body font-semibold">{amenity.name}</p><p className="mt-1 text-caption text-muted">{formatDate(booking.date)} · {booking.startTime}–{booking.endTime}</p></div></Link>)}{!data.events.length && !data.upcomingBookings.length ? <p className="px-5 py-6 text-body text-muted">No events or bookings coming up.</p> : null}</div>
          </Card>
        </div>
        {activePoll ? <section className="flex items-start gap-4 rounded-panel border border-line bg-white p-5"><Vote className="mt-1 size-5 shrink-0 text-muted" /><div><h2 className="text-section font-semibold">Have your say</h2><p className="mt-2 text-body text-ink-soft">{activePoll.question}</p><p className="mt-2 text-caption text-muted">{activePoll.endsAt ? `Closes ${formatDate(activePoll.endsAt)}` : "Voting is open"} · {activePoll.audience === "owners" ? "Owners" : activePoll.audience === "tenants" ? "Tenants" : "Residents"}</p><Link href="/app/community?tab=polls" className="mt-3 inline-flex min-h-9 items-center gap-2 text-body font-semibold text-brand-700">{data.votedPollIds.has(activePoll.id) ? "View results" : "Cast your vote"}<ArrowRight className="size-4" /></Link></div></section> : null}
      </div>
    </div>
  </div>;
}
