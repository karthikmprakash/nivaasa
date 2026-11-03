import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, BellRing, Building2, CalendarHeart, CheckCircle2,
  ChevronRight, Clock3, IndianRupee, Package, ShieldCheck, Sparkles,
  TrendingUp, UsersRound, Wallet, Wrench, Zap, MessageSquare, Megaphone, ScrollText,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, Stat } from "@/components/ui/primitives";
import { CollectionsChart } from "@/components/admin/collections-chart";
import { requireAdmin } from "@/lib/queries";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin console" };

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  pending: "bg-amber-soft text-amber-ink", approved: "bg-brand-50 text-brand-700", entered: "bg-blush-50 text-blush-600",
  exited: "bg-canvas text-muted", denied: "bg-[#fdeced] text-[#c43d4d]", expired: "bg-canvas text-muted",
};

export default async function AdminDashboard() {
  const ctx = await requireAdmin();
  const { now, snapshot, monthly, growth, pendingPayments, pendingDiscussions, pendingMoves, openPanics, recentVisitors, ticketCats, patrolScanned, patrolMissed, staffToday, staffCount, bookingRows, deliveryToday, avgClosure, topDues, maxCategory, attention } = await getAdminDashboardData(ctx.society!.id);
  const firstName = ctx.user.name.split(" ")[0];
  const hour = Number(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-caption font-medium text-muted"><span className="inline-flex size-1.5 rounded-lg bg-brand-500" /> {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {ctx.society!.name}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[30px]">{greeting}, {firstName}.</h1>
          <p className="mt-1.5 text-body text-ink-soft">Here&apos;s the pulse of your community. {attention ? <span className="font-medium text-ink">{attention} things need your attention.</span> : "Everything looks calm."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/billing" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-caption font-semibold text-ink-soft hover:bg-canvas"><Wallet className="size-4" /> Run billing</Link>
          <Link href="/admin/communications" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-caption font-semibold text-white hover:bg-brand-700"><BellRing className="size-4" /> Publish notice</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Collected this month" value={formatINR(snapshot.collections)} hint={growth === null ? "No previous month to compare" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs last month`} tone="blue" />
        <Stat label="Outstanding" value={formatINR(snapshot.outstanding)} hint={`${snapshot.outstandingCount} open invoices`} />
        <Stat label="Open requests" value={snapshot.openTickets} hint={`${snapshot.slaRisk} approaching or past SLA`} />
        <Stat label="Gate entries this month" value={snapshot.visitors} hint={`${deliveryToday[0]?.count ?? 0} deliveries today`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="order-2 xl:order-1 xl:col-span-2">
          <CardHeader title="Collections vs expenses" description="The last six months, at a glance" icon={<TrendingUp className="size-4" />} action={<Link href="/admin/reports" className="inline-flex items-center gap-1 text-caption font-semibold text-brand-600">Full report <ArrowUpRight className="size-4" /></Link>} />
          <div className="flex flex-wrap items-center gap-4 px-5 pb-1"><span className="flex items-center gap-1.5 text-caption text-muted"><span className="size-2 rounded-lg bg-brand-500" /> Collected</span><span className="flex items-center gap-1.5 text-caption text-muted"><span className="size-2 rounded-lg bg-[#8491a8]" /> Spent</span><span className="ml-auto text-caption font-semibold text-ink">{formatINR(snapshot.collections)} <span className="font-normal text-muted">this month</span></span></div>
          <div className="px-2 pb-4 pr-4"><CollectionsChart data={monthly} /></div>
        </Card>

        <Card className="order-1 xl:order-2">
          <CardHeader title="Needs attention" description={`${attention} open items`} icon={<Zap className="size-4" />}  />
          <div className="border-t border-line">
            {openPanics.map((p) => (
              <Link key={p.alert.id} href="/admin/security" className="flex items-start gap-2.5 border-b border-line/70 bg-[#fdf1f3] px-5 py-3 last:border-0">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#d94a5a] text-white"><AlertTriangle className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">Panic alert · Home {p.unit}</p><p className="truncate text-caption text-[#9e4a55]">{p.user} · {timeAgo(p.alert.createdAt)}</p></div>
                <Badge variant="danger">Respond</Badge>
              </Link>
            ))}
            {pendingPayments.map((p) => (
              <Link key={p.payment.id} href="/admin/billing" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-soft text-amber-ink"><IndianRupee className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">Verify {p.payment.method.toUpperCase()} payment</p><p className="truncate text-caption text-muted">{p.user} · {p.unit} · {formatINR(p.payment.amount)}</p></div>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
            {pendingDiscussions.map((d) => (
              <Link key={d.discussion.id} href="/admin/communications" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><MessageSquare className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">Review discussion</p><p className="truncate text-caption text-muted">{d.user} · {d.discussion.title}</p></div>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
            {pendingMoves.map((m) => (
              <Link key={m.request.id} href="/admin/residents" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f2effc] text-[#6a54c8]"><Building2 className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink capitalize">Approve {m.request.type.replace("_", " ")}</p><p className="truncate text-caption text-muted">Home {m.unit} · {m.user} · {formatDate(m.request.date)}</p></div>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
            {snapshot.slaRisk > 0 ? <Link href="/admin/helpdesk" className="flex items-center gap-3 border-b border-line px-5 py-4 text-body hover:bg-canvas/50"><Clock3 className="size-5 shrink-0 text-amber-ink" /><div className="flex-1"><p className="font-semibold">{snapshot.slaRisk} requests need follow-up</p><p className="text-caption text-muted">Approaching or past their service deadline</p></div><ChevronRight className="size-4 text-muted" /></Link> : null}
            {!attention ? <div className="px-5 py-10 text-center"><CheckCircle2 className="mx-auto size-6 text-mint-600" /><p className="mt-2 text-caption font-semibold text-ink">All clear</p><p className="text-caption text-muted">Nothing needs you right now.</p></div> : null}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Helpdesk load" description="Open requests by category" icon={<Wrench className="size-4" />} action={<Link href="/admin/helpdesk" className="text-caption font-semibold text-brand-600">Manage</Link>} />
          <div className="border-t border-line px-5 py-4">
            <div className="space-y-3">
              {ticketCats.map((t, i) => (
                <div key={t.category}>
                  <div className="flex items-center justify-between text-caption"><span className="font-medium text-ink-soft">{t.category}</span><span className="font-semibold text-ink">{t.count}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-lg bg-[#eef1f8]"><div className={i === 0 ? "h-full rounded-lg bg-brand-500" : i === 1 ? "h-full rounded-lg bg-brand-300" : "h-full rounded-lg bg-brand-200"} style={{ width: `${(t.count / maxCategory) * 100}%` }} /></div>
                </div>
              ))}
              {!ticketCats.length ? <p className="py-4 text-center text-caption text-muted">No open tickets.</p> : null}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5"><span className="text-caption text-muted">Avg. closure time</span><span className="text-caption font-semibold text-ink">{avgClosure ? `${avgClosure.toFixed(1)}h` : "—"} <span className="text-caption font-normal text-muted">resolved</span></span></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent gate activity" description="Latest visitor records" icon={<ShieldCheck className="size-4" />} action={<Link href="/admin/security" className="text-caption font-semibold text-brand-600">Live view</Link>} />
          <div className="border-t border-line">
            {recentVisitors.map(({ visitor: v, unit }) => (
              <div key={v.id} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <Avatar name={v.name} color={v.photoColor} size="xs" />
                <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{v.name} <span className="font-normal text-muted">· {v.company ?? v.type}</span></p><p className="text-caption text-muted">Home {unit ?? "—"} · {timeAgo(v.createdAt)}</p></div>
                <span className={`rounded-lg px-1.5 py-0.5 text-caption font-bold capitalize ${statusTone[v.status] ?? "bg-canvas text-muted"}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top outstanding homes" description="Homes with the largest unpaid balances" icon={<Wallet className="size-4" />} action={<Link href="/admin/billing" className="text-caption font-semibold text-brand-600">Billing</Link>} />
          <div className="border-t border-line">
            {topDues.map((d, i) => (
              <div key={d.unit} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <span className="grid size-6 place-items-center rounded-lg bg-canvas text-caption font-bold text-muted">{i + 1}</span>
                <p className="flex-1 text-caption font-semibold text-ink">Home {d.unit}</p>
                <span className="text-caption font-semibold text-ink">{formatINR(d.total)}</span>
                <Link href="/admin/billing" className="text-caption font-semibold text-brand-600">Review</Link>
              </div>
            ))}
            {!topDues.length ? <p className="px-5 py-6 text-center text-caption text-muted">No outstanding dues. Beautiful.</p> : null}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Today at a glance" description={formatDate(now)} icon={<Sparkles className="size-4" />} />
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
            {[
              { l: "Staff checked in", v: `${staffToday[0]?.count ?? 0}/${staffCount[0]?.count ?? 0}`, icon: UsersRound },
              { l: "Patrol rounds", v: `${patrolScanned} scanned${patrolMissed ? ` · ${patrolMissed} missed` : ""}`, icon: ShieldCheck },
              { l: "Amenity bookings", v: String(snapshot.bookings), icon: CalendarHeart },
              { l: "Deliveries", v: String(deliveryToday[0]?.count ?? 0), icon: Package },
            ].map((o) => <div key={o.l} className="bg-white px-4 py-3"><o.icon className="size-3.5 text-brand-500" /><p className="mt-1.5 text-body font-semibold text-ink">{o.v}</p><p className="text-caption text-muted">{o.l}</p></div>)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming at the clubhouse" description="Confirmed bookings" icon={<CalendarHeart className="size-4" />} action={<Link href="/admin/amenities" className="text-caption font-semibold text-brand-600">All</Link>} />
          <div className="border-t border-line">
            {bookingRows.map((b) => (
              <div key={b.booking.id} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blush-50 text-center"><span className="text-caption font-bold uppercase text-blush-500">{formatDate(b.booking.date, { month: "short" })}</span><span className="text-caption font-bold leading-none text-ink">{new Date(b.booking.date + "T00:00").getDate()}</span></div>
                <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{b.amenity}</p><p className="text-caption text-muted">Home {b.unit} · {b.booking.startTime}–{b.booking.endTime}</p></div>
              </div>
            ))}
            {!bookingRows.length ? <p className="px-5 py-6 text-center text-caption text-muted">No upcoming bookings.</p> : null}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-[#fbfcff] to-brand-50/50">
          <div className="p-5">
            <div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-white text-brand-600 shadow-sm"><Zap className="size-4" /></span><Badge variant="blue">Quick actions</Badge></div>
            <p className="mt-3 text-body font-semibold text-ink">Keep the day moving</p>
            <div className="mt-3 space-y-2">
              {[
                { l: "Run the monthly billing", h: "/admin/billing", icon: Wallet },
                { l: "Review helpdesk SLAs", h: "/admin/helpdesk", icon: Wrench },
                { l: "Publish a notice", h: "/admin/communications", icon: Megaphone },
                { l: "Open financial reports", h: "/admin/reports", icon: ScrollText },
              ].map((a) => <Link key={a.l} href={a.h} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 text-caption font-medium text-ink-soft transition-colors hover:border-brand-200 hover:text-ink"><a.icon className="size-3.5 text-brand-500" /><span className="flex-1">{a.l}</span><ChevronRight className="size-4 text-muted" /></Link>)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
