import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock3,
  FileText, HelpCircle, MapPin, MessageSquare, Package, Plus, ShieldAlert, Sparkles,
  TicketCheck, UserRoundPlus, Users, Vote, Wallet, Wrench, CalendarHeart, BellRing,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { VisitorApprovalCard } from "@/components/app/visitor-approval-card";
import { getResidentHomeData, requireResident } from "@/lib/queries";
import { formatDate, formatINR, formatTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryStyle: Record<string, { label: string; variant: "blue" | "pink" | "success" | "warning" | "neutral" | "purple" }> = {
  general: { label: "General", variant: "blue" },
  maintenance: { label: "Maintenance", variant: "warning" },
  security: { label: "Security", variant: "purple" },
  event: { label: "Event", variant: "pink" },
  finance: { label: "Finance", variant: "success" },
  emergency: { label: "Emergency", variant: "danger" as never },
};

const quickActions = [
  { href: "/app/visitors/new", label: "Pre-approve", icon: UserRoundPlus, tone: "bg-brand-50 text-brand-600" },
  { href: "/app/helpdesk/new", label: "Helpdesk", icon: Wrench, tone: "bg-blush-50 text-blush-500" },
  { href: "/app/amenities", label: "Amenities", icon: CalendarHeart, tone: "bg-[#f2effc] text-[#6a54c8]" },
  { href: "/app/payments", label: "Payments", icon: Wallet, tone: "bg-mint-50 text-mint-600" },
  { href: "/app/directory", label: "Directory", icon: Users, tone: "bg-[#f7f2e8] text-[#8a6a32]" },
  { href: "/app/documents", label: "Documents", icon: FileText, tone: "bg-[#eef3f8] text-[#4b6a8a]" },
];

export default async function ResidentHomePage() {
  const ctx = await requireResident();
  const data = await getResidentHomeData(ctx);
  const hour = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const firstName = ctx.user.name.split(" ")[0];
  const activePoll = data.polls[0];

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium text-muted"><span className="inline-flex size-1.5 rounded-full bg-blush-400" /> {today} · {ctx.society.name}</p>
          <h1 className="mt-1.5 font-display text-[34px] leading-none text-ink sm:text-[40px]">{greeting}, {firstName}.</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {data.pendingVisitors.length > 0
              ? `${data.pendingVisitors.length === 1 ? "Someone is" : `${data.pendingVisitors.length} people are`} waiting at the gate for you.`
              : "The gate is quiet, the community is well. Here's what's happening today."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/visitors/new" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(49,85,216,0.6)] hover:bg-brand-700">
            <UserRoundPlus className="size-4" /> Pre-approve a visitor
          </Link>
          <Link href="/app/emergency" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#f3d0d4] bg-[#fdf1f3] px-3.5 text-[12px] font-semibold text-[#c43d4d] hover:bg-[#fbe6e9]">
            <ShieldAlert className="size-4" /> Emergency
          </Link>
        </div>
      </div>

      {data.dues.overdue > 0 ? (
        <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#f0d6bd] bg-[#fff8ef] px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#fbe8d2] text-amber-ink"><BellRing className="size-3.5" /></span>
            <div><p className="text-[12px] font-semibold text-ink">One invoice is overdue</p><p className="text-[10.5px] text-ink-soft">Settle {formatINR(data.dues.total)} across {data.dues.count} {data.dues.count === 1 ? "invoice" : "invoices"} to avoid a late fee.</p></div>
          </div>
          <Link href="/app/payments" className="text-[11px] font-semibold text-amber-ink hover:underline">Review payments →</Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {quickActions.map((a) => (
              <Link key={a.href} href={a.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-white px-2 py-3.5 text-center shadow-[0_1px_2px_rgba(19,26,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft">
                <span className={`grid size-9 place-items-center rounded-xl ${a.tone} transition-transform group-hover:scale-105`}><a.icon className="size-[18px]" /></span>
                <span className="text-[10.5px] font-semibold text-ink-soft">{a.label}</span>
              </Link>
            ))}
          </div>

          {/* Pending gate */}
          <section>
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">At your gate</h2>
                {data.pendingVisitors.length ? <span className="rounded-full bg-blush-100 px-2 py-0.5 text-[9.5px] font-bold text-blush-600">{data.pendingVisitors.length} waiting</span> : null}
              </div>
              <Link href="/app/visitors" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700">All visitors <ChevronRight className="size-3" /></Link>
            </div>
            {data.pendingVisitors.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {data.pendingVisitors.map((v) => <VisitorApprovalCard key={v.id} visitor={{ ...v, createdAt: v.createdAt }} />)}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5">
                <span className="grid size-9 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-4" /></span>
                <div className="flex-1"><p className="text-[12px] font-semibold text-ink">You&apos;re all caught up</p><p className="text-[10.5px] text-muted">Approvals will appear here the moment someone arrives.</p></div>
                <Link href="/app/visitors/new" className="text-[10.5px] font-semibold text-brand-600">Pre-approve</Link>
              </div>
            )}
          </section>

          {/* Notices */}
          <Card>
            <CardHeader
              title="From your community"
              description="Official notices and updates from the committee"
              icon={<MessageSquare className="size-4" />}
              action={<Link href="/app/community" className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">View all <ArrowRight className="size-3" /></Link>}
            />
            <div className="divide-y divide-line border-t border-line">
              {data.notices.map((n) => {
                const cat = categoryStyle[n.category] ?? categoryStyle.general;
                return (
                  <Link key={n.id} href={`/app/community/notices/${n.id}`} className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-[#fbfcff] sm:px-6">
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${n.pinned ? "bg-blush-400" : "bg-brand-200"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={cat.variant}>{cat.label}</Badge>
                        {n.pinned ? <span className="text-[9px] font-bold uppercase tracking-wide text-blush-500">Pinned</span> : null}
                        <span className="text-[9.5px] text-muted">{timeAgo(n.publishedAt)}</span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-ink group-hover:text-brand-700">{n.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-relaxed text-muted">{n.body.replace(/\n/g, " ")}</p>
                    </div>
                    <ChevronRight className="mt-2 size-3.5 shrink-0 text-[#c2c8d5] group-hover:text-brand-500" />
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Helpdesk + events */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Your requests" description="Open helpdesk tickets" icon={<Wrench className="size-4" />} action={<Link href="/app/helpdesk" className="text-[10.5px] font-semibold text-brand-600">All</Link>} />
              <div className="border-t border-line">
                {data.openTickets.length ? data.openTickets.map((t) => (
                  <Link key={t.id} href={`/app/helpdesk/${t.id}`} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-canvas text-brand-600"><TicketCheck className="size-3.5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-ink">{t.subject}</p><p className="text-[9.5px] text-muted">{t.category} · updated {timeAgo(t.updatedAt)}</p></div>
                    <Badge variant={t.status === "in_progress" || t.status === "reopened" ? "blue" : "warning"}>{t.status.replace("_", " ")}</Badge>
                  </Link>
                )) : <EmptyState title="No open requests" description="Something need fixing? Raise a request and we'll track it." className="py-8" />}
              </div>
            </Card>

            <Card>
              <CardHeader title="Coming up" description="Events and bookings" icon={<CalendarDays className="size-4" />} action={<Link href="/app/community?tab=events" className="text-[10.5px] font-semibold text-brand-600">Calendar</Link>} />
              <div className="border-t border-line">
                {data.events.slice(0, 2).map((e) => (
                  <Link key={e.id} href={`/app/community?tab=events`} className="flex gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blush-50 text-center">
                      <span className="text-[7px] font-bold uppercase text-blush-500">{formatDate(e.startAt, { month: "short" })}</span>
                      <span className="text-[13px] font-bold leading-none text-ink">{new Date(e.startAt).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-ink">{e.title}</p><p className="mt-0.5 flex items-center gap-1 text-[9.5px] text-muted"><Clock3 className="size-2.5" /> {formatTime(e.startAt)} · {e.location}</p></div>
                    <ChevronRight className="mt-2 size-3.5 text-[#c2c8d5]" />
                  </Link>
                ))}
                {data.upcomingBookings.map(({ booking, amenity }) => (
                  <Link key={booking.id} href="/app/amenities" className="flex gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><CalendarHeart className="size-4" /></div>
                    <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-ink">{amenity.name}</p><p className="mt-0.5 text-[9.5px] text-muted">{formatDate(booking.date)} · {booking.startTime}–{booking.endTime}</p></div>
                    <Badge variant="success">Confirmed</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Poll */}
          {activePoll ? (
            <div className="relative overflow-hidden rounded-[20px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-blush-50 p-5">
              <div className="absolute -right-10 -top-10 size-32 rounded-full bg-blush-200/40 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><Vote className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-brand-600">Your voice · {activePoll.audience === "owners" ? "Owners" : "All residents"}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-ink">{activePoll.question}</p>
                  <p className="mt-1 text-[10px] text-muted">{activePoll.endsAt ? `Closes ${formatDate(activePoll.endsAt)}` : "Open poll"} · {activePoll.options.length} choices</p>
                  <Link href="/app/community?tab=polls" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-[10.5px] font-semibold text-white">{data.votedPollIds.has(activePoll.id) ? "See results" : "Cast your vote"} <ArrowRight className="size-3" /></Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.7)]">
            <div className="absolute -right-12 -top-12 size-36 rounded-full border-[18px] border-white/5" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-medium text-white/60">Total due</p>
                <Link href="/app/payments" className="text-[9.5px] font-semibold text-white/70 hover:text-white">Statement →</Link>
              </div>
              <p className="mt-1.5 text-[32px] font-semibold tracking-[-0.04em]">{formatINR(data.dues.total)}</p>
              <p className="mt-1 text-[10px] text-white/55">{data.dues.count} {data.dues.count === 1 ? "invoice" : "invoices"}{data.dues.overdue ? ` · ${data.dues.overdue} overdue` : ""}</p>
              <div className="mt-4 flex items-center gap-2">
                <Link href="/app/payments" className="rounded-full bg-white px-4 py-2 text-[11px] font-bold text-brand-700 transition-transform hover:scale-[1.02]">Pay now</Link>
                <Link href="/app/payments?tab=history" className="rounded-full border border-white/20 px-3 py-2 text-[10.5px] font-semibold text-white/80 hover:bg-white/10">Receipts</Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <div><p className="text-[8.5px] font-medium uppercase tracking-wide text-white/40">Advance</p><p className="mt-0.5 text-[12px] font-semibold">{formatINR(0)}</p></div>
                <div><p className="text-[8.5px] font-medium uppercase tracking-wide text-white/40">Deposit</p><p className="mt-0.5 text-[12px] font-semibold">{formatINR(0)}</p></div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader title="Your home" description={`${ctx.unit.number} · ${ctx.unit.unitType} · ${ctx.unit.areaSqft} sq ft`} action={<Link href="/app/my-home" className="text-[10.5px] font-semibold text-brand-600">Manage</Link>} />
            <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
              {[
                { l: "Family", v: 3, href: "/app/my-home#family" },
                { l: "Vehicles", v: 2, href: "/app/my-home#vehicles" },
                { l: "Pets", v: 1, href: "/app/my-home#pets" },
              ].map((s) => (
                <Link key={s.l} href={s.href} className="bg-white px-3 py-3.5 text-center hover:bg-[#fbfcff]">
                  <p className="text-[17px] font-semibold text-ink">{s.v}</p>
                  <p className="text-[9.5px] text-muted">{s.l}</p>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Deliveries" description="At the gate or left for you" icon={<Package className="size-4" />} action={<Link href="/app/deliveries" className="text-[10.5px] font-semibold text-brand-600">All</Link>} />
            <div className="border-t border-line">
              {data.deliveries.length ? data.deliveries.slice(0, 3).map((d) => (
                <div key={d.id} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0">
                  <span className={`size-1.5 rounded-full ${d.status === "arrived" ? "bg-blush-400" : "bg-amber-ink"}`} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-ink">{d.company} {d.status === "left_at_gate" ? "· kept at gate" : "· at the gate"}</p><p className="text-[9px] text-muted">{timeAgo(d.createdAt)} {d.otp ? `· OTP ${d.otp}` : ""}</p></div>
                  <Badge variant={d.status === "arrived" ? "pink" : "warning"}>{d.status === "arrived" ? "Waiting" : "Collect"}</Badge>
                </div>
              )) : <p className="px-5 py-6 text-center text-[10.5px] text-muted">No deliveries at the gate.</p>}
            </div>
          </Card>

          <div className="rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-center gap-2.5">
              <span className="relative grid size-8 place-items-center rounded-full bg-blush-50 text-blush-500"><ShieldAlert className="size-4" /><span className="absolute inset-0 rounded-full pulse-ring" /></span>
              <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold text-ink">Emergency & safety</p><p className="text-[9.5px] text-muted">Guard alert, contacts, medical info</p></div>
              <Link href="/app/emergency" className="rounded-lg bg-[#fdf1f3] px-2.5 py-1.5 text-[9.5px] font-bold text-[#c43d4d]">Open</Link>
            </div>
          </div>

          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4">
            <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">This month</p><CircleDot className="size-3 text-brand-300" /></div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><p className="text-[17px] font-semibold text-ink">184</p><p className="text-[9px] text-muted">gate entries</p></div>
              <div><p className="text-[17px] font-semibold text-ink">12</p><p className="text-[9px] text-muted">visitor passes</p></div>
            </div>
            <ProgressBar value={84} tone="blue" className="mt-3" />
            <p className="mt-1.5 text-[9px] text-muted">84% of this month&apos;s dues collected</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
