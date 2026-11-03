import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  AlertTriangle, ArrowRight, ArrowUpRight, BellRing, Building2, CalendarHeart, CheckCircle2,
  ChevronRight, CircleDot, Clock3, DoorOpen, IndianRupee, Package, ShieldCheck, Sparkles, TicketCheck,
  TrendingUp, UsersRound, Wallet, Wrench, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { CollectionsChart } from "@/components/admin/collections-chart";
import { getAdminSnapshot, requireAdmin } from "@/lib/queries";
import { getUnreadCount } from "@/lib/queries";
import { db } from "@/db";
import {
  amenities, amenityBookings, deliveries, discussions, expenses, helpdeskTickets, invoices, moveRequests,
  panicAlerts, patrolRounds, payments, staff, staffAttendance, units, users, visitors,
} from "@/db/schema";
import { formatDate, formatINR, formatTime, timeAgo, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin console" };

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  pending: "bg-amber-soft text-amber-ink", approved: "bg-brand-50 text-brand-700", entered: "bg-blush-50 text-blush-600",
  exited: "bg-canvas text-muted", denied: "bg-[#fdeced] text-[#c43d4d]", expired: "bg-canvas text-muted",
};

export default async function AdminDashboard() {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const start6 = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const today = todayISO();
  const [snapshot, payRows, expRows, topDues, pendingPayments, pendingDiscussions, pendingMoves, openPanics, recentVisitors, ticketCats, patrolRows, staffToday, staffCount, bookingRows, deliveryToday, avgClosureRows] = await Promise.all([
    getAdminSnapshot(societyId),
    db.select({ paidAt: payments.paidAt, amount: payments.amount }).from(payments).where(and(eq(payments.societyId, societyId), eq(payments.status, "success"), gte(payments.paidAt, start6))),
    db.select({ date: expenses.date, amount: expenses.amount }).from(expenses).where(and(eq(expenses.societyId, societyId), gte(expenses.createdAt, start6))),
    db.select({ unit: units.number, total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)` }).from(invoices).innerJoin(units, eq(invoices.unitId, units.id)).where(and(eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))).groupBy(units.number).orderBy(desc(sql`sum(${invoices.total} - ${invoices.amountPaid})`)).limit(6),
    db.select({ payment: payments, unit: units.number, user: users.name }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).leftJoin(users, eq(payments.userId, users.id)).where(and(eq(payments.societyId, societyId), eq(payments.status, "pending"))).orderBy(desc(payments.createdAt)).limit(4),
    db.select({ discussion: discussions, user: users.name }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "pending"))).orderBy(desc(discussions.createdAt)).limit(4),
    db.select({ request: moveRequests, unit: units.number, user: users.name }).from(moveRequests).innerJoin(units, eq(moveRequests.unitId, units.id)).innerJoin(users, eq(moveRequests.userId, users.id)).where(and(eq(moveRequests.societyId, societyId), eq(moveRequests.status, "pending"))).limit(4),
    db.select({ alert: panicAlerts, unit: units.number, user: users.name }).from(panicAlerts).leftJoin(units, eq(panicAlerts.unitId, units.id)).leftJoin(users, eq(panicAlerts.userId, users.id)).where(and(eq(panicAlerts.societyId, societyId), inArray(panicAlerts.status, ["open", "acknowledged"]))).limit(4),
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(eq(visitors.societyId, societyId)).orderBy(desc(visitors.createdAt)).limit(6),
    db.select({ category: helpdeskTickets.category, count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))).groupBy(helpdeskTickets.category).orderBy(desc(sql`count(*)`)).limit(5),
    db.select({ status: patrolRounds.status, count: sql<number>`count(*)` }).from(patrolRounds).where(and(eq(patrolRounds.societyId, societyId), gte(patrolRounds.scannedAt, new Date(today)))).groupBy(patrolRounds.status),
    db.select({ count: sql<number>`count(*)` }).from(staffAttendance).where(and(eq(staffAttendance.societyId, societyId), eq(staffAttendance.date, today))),
    db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.societyId, societyId), eq(staff.active, true))),
    db.select({ booking: amenityBookings, amenity: amenities.name, unit: units.number }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).innerJoin(units, eq(amenityBookings.unitId, units.id)).where(and(eq(amenityBookings.societyId, societyId), gte(amenityBookings.date, today), eq(amenityBookings.status, "confirmed"))).orderBy(amenityBookings.date).limit(4),
    db.select({ count: sql<number>`count(*)` }).from(deliveries).where(and(eq(deliveries.societyId, societyId), gte(deliveries.createdAt, new Date(today)))),
    db.select({ avg: sql<number>`coalesce(avg((${helpdeskTickets.resolvedAt} - ${helpdeskTickets.createdAt}) / 3600000.0), 0)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, societyId), sql`${helpdeskTickets.resolvedAt} is not null`)),
  ]);
  const avgClosure = avgClosureRows[0]?.avg ?? 0;
  const unread = await getUnreadCount(ctx.user.id, societyId);
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const collected = payRows.filter((p) => p.paidAt.toISOString().slice(0, 7) === key).reduce((s, p) => s + p.amount, 0) / 100;
    const spent = expRows.filter((e) => e.date.slice(0, 7) === key).reduce((s, e) => s + e.amount, 0) / 100;
    return { month: d.toLocaleDateString("en-IN", { month: "short" }), collected, expenses: spent };
  });
  const thisMonth = monthly[5]?.collected ?? 0;
  const prevMonth = monthly[4]?.collected ?? 0;
  const growth = prevMonth ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;
  const patrolScanned = patrolRows.find((p) => p.status === "scanned")?.count ?? 0;
  const patrolMissed = patrolRows.find((p) => p.status === "missed")?.count ?? 0;
  const maxCategory = Math.max(1, ...ticketCats.map((t) => t.count));
  const attention = pendingPayments.length + pendingDiscussions.length + pendingMoves.length + openPanics.length + (snapshot.slaRisk ? 1 : 0);
  const firstName = ctx.user.name.split(" ")[0];
  const hour = Number(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10.5px] font-medium text-muted"><span className="inline-flex size-1.5 rounded-full bg-brand-500" /> {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {ctx.society!.name}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[30px]">{greeting}, {firstName}.</h1>
          <p className="mt-1.5 text-[12px] text-ink-soft">Here&apos;s the pulse of your community. {attention ? <span className="font-medium text-ink">{attention} things need your attention.</span> : "Everything looks calm."}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/billing" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[11px] font-semibold text-ink-soft hover:bg-canvas"><Wallet className="size-3.5" /> Run billing</Link>
          <Link href="/admin/communications" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[11px] font-semibold text-white hover:bg-brand-700"><BellRing className="size-3.5" /> Publish notice</Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: "Collected this month", value: formatINR(snapshot.collections), hint: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}% vs last month`, icon: TrendingUp, tone: "bg-brand-50 text-brand-600", accent: "text-mint-600" },
          { label: "Outstanding", value: formatINR(snapshot.outstanding), hint: `${snapshot.outstandingCount} open invoices`, icon: Wallet, tone: "bg-blush-50 text-blush-500", accent: "text-[#c43d4d]" },
          { label: "Open tickets", value: String(snapshot.openTickets), hint: `${snapshot.slaRisk} nearing SLA`, icon: Wrench, tone: "bg-[#f2effc] text-[#6a54c8]", accent: "text-amber-ink" },
          { label: "Gate activity", value: String(snapshot.visitors), hint: `${deliveryToday[0]?.count ?? 0} deliveries today`, icon: DoorOpen, tone: "bg-mint-50 text-mint-600", accent: "text-mint-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(19,26,42,0.03)]">
            <div className="flex items-start justify-between"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">{s.label}</p><span className={`grid size-7 place-items-center rounded-lg ${s.tone}`}><s.icon className="size-3.5" /></span></div>
            <p className="mt-2 text-[23px] font-semibold leading-none tracking-[-0.04em] text-ink">{s.value}</p>
            <p className={`mt-1.5 text-[9.5px] font-medium ${s.accent}`}>{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Collections vs expenses" description="The last six months, at a glance" icon={<TrendingUp className="size-4" />} action={<Link href="/admin/reports" className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600">Full report <ArrowUpRight className="size-3" /></Link>} />
          <div className="flex flex-wrap items-center gap-4 px-5 pb-1"><span className="flex items-center gap-1.5 text-[9px] text-muted"><span className="size-2 rounded-full bg-brand-500" /> Collected</span><span className="flex items-center gap-1.5 text-[9px] text-muted"><span className="size-2 rounded-full bg-blush-400" /> Spent</span><span className="ml-auto text-[10px] font-semibold text-ink">{formatINR(snapshot.collections)} <span className="font-normal text-muted">this month</span></span></div>
          <div className="px-2 pb-4 pr-4"><CollectionsChart data={monthly} /></div>
        </Card>

        <Card>
          <CardHeader title="Needs attention" description={`${attention} open items`} icon={<Zap className="size-4" />} action={<Link href="/admin/security" className="text-[10px] font-semibold text-brand-600">Open all</Link>} />
          <div className="border-t border-line">
            {openPanics.map((p) => (
              <Link key={p.alert.id} href="/admin/security" className="flex items-start gap-2.5 border-b border-line/70 bg-[#fdf1f3] px-5 py-3 last:border-0">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#d94a5a] text-white"><AlertTriangle className="size-3.5" /></span>
                <div className="min-w-0 flex-1"><p className="text-[10.5px] font-semibold text-ink">Panic alert · Home {p.unit}</p><p className="truncate text-[9px] text-[#9e4a55]">{p.user} · {timeAgo(p.alert.createdAt)}</p></div>
                <Badge variant="danger">Respond</Badge>
              </Link>
            ))}
            {pendingPayments.map((p) => (
              <Link key={p.payment.id} href="/admin/billing" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-soft text-amber-ink"><IndianRupee className="size-3.5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink">Verify {p.payment.method.toUpperCase()} payment</p><p className="truncate text-[9px] text-muted">{p.user} · {p.unit} · {formatINR(p.payment.amount)}</p></div>
                <ChevronRight className="size-3 text-muted" />
              </Link>
            ))}
            {pendingDiscussions.map((d) => (
              <Link key={d.discussion.id} href="/admin/communications" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><MessageIcon /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink">Review discussion</p><p className="truncate text-[9px] text-muted">{d.user} · {d.discussion.title}</p></div>
                <ChevronRight className="size-3 text-muted" />
              </Link>
            ))}
            {pendingMoves.map((m) => (
              <Link key={m.request.id} href="/admin/residents" className="flex items-center gap-2.5 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-[#fbfcff]">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f2effc] text-[#6a54c8]"><Building2 className="size-3.5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink capitalize">Approve {m.request.type.replace("_", " ")}</p><p className="truncate text-[9px] text-muted">Home {m.unit} · {m.user} · {formatDate(m.request.date)}</p></div>
                <ChevronRight className="size-3 text-muted" />
              </Link>
            ))}
            {!attention ? <div className="px-5 py-10 text-center"><CheckCircle2 className="mx-auto size-6 text-mint-600" /><p className="mt-2 text-[11px] font-semibold text-ink">All clear</p><p className="text-[9.5px] text-muted">Nothing needs you right now.</p></div> : null}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Helpdesk load" description="Open requests by category" icon={<Wrench className="size-4" />} action={<Link href="/admin/helpdesk" className="text-[10px] font-semibold text-brand-600">Manage</Link>} />
          <div className="border-t border-line px-5 py-4">
            <div className="space-y-3">
              {ticketCats.map((t, i) => (
                <div key={t.category}>
                  <div className="flex items-center justify-between text-[9.5px]"><span className="font-medium text-ink-soft">{t.category}</span><span className="font-semibold text-ink">{t.count}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef1f8]"><div className={i === 0 ? "h-full rounded-full bg-brand-500" : i === 1 ? "h-full rounded-full bg-blush-400" : "h-full rounded-full bg-brand-200"} style={{ width: `${(t.count / maxCategory) * 100}%` }} /></div>
                </div>
              ))}
              {!ticketCats.length ? <p className="py-4 text-center text-[10px] text-muted">No open tickets.</p> : null}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5"><span className="text-[9px] text-muted">Avg. closure time</span><span className="text-[11px] font-semibold text-ink">{avgClosure ? `${avgClosure.toFixed(1)}h` : "—"} <span className="text-[8.5px] font-normal text-muted">resolved</span></span></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent gate activity" description="Live from Gate 1" icon={<ShieldCheck className="size-4" />} action={<Link href="/admin/security" className="text-[10px] font-semibold text-brand-600">Live view</Link>} />
          <div className="border-t border-line">
            {recentVisitors.map(({ visitor: v, unit }) => (
              <div key={v.id} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <Avatar name={v.name} color={v.photoColor} size="xs" />
                <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-ink">{v.name} <span className="font-normal text-muted">· {v.company ?? v.type}</span></p><p className="text-[8.5px] text-muted">Home {unit ?? "—"} · {timeAgo(v.createdAt)}</p></div>
                <span className={`rounded-full px-1.5 py-0.5 text-[7.5px] font-bold capitalize ${statusTone[v.status] ?? "bg-canvas text-muted"}`}>{v.status}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Top outstanding homes" description="Oldest and largest dues" icon={<Wallet className="size-4" />} action={<Link href="/admin/billing" className="text-[10px] font-semibold text-brand-600">Billing</Link>} />
          <div className="border-t border-line">
            {topDues.map((d, i) => (
              <div key={d.unit} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <span className="grid size-6 place-items-center rounded-lg bg-canvas text-[8px] font-bold text-muted">{i + 1}</span>
                <p className="flex-1 text-[10.5px] font-semibold text-ink">Home {d.unit}</p>
                <span className="text-[10.5px] font-semibold text-ink">{formatINR(d.total)}</span>
                <Link href="/admin/billing" className="text-[8.5px] font-semibold text-brand-600">Remind</Link>
              </div>
            ))}
            {!topDues.length ? <p className="px-5 py-6 text-center text-[10px] text-muted">No outstanding dues. Beautiful.</p> : null}
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
            ].map((o) => <div key={o.l} className="bg-white px-4 py-3"><o.icon className="size-3.5 text-brand-500" /><p className="mt-1.5 text-[13px] font-semibold text-ink">{o.v}</p><p className="text-[8.5px] text-muted">{o.l}</p></div>)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Upcoming at the clubhouse" description="Confirmed bookings" icon={<CalendarHeart className="size-4" />} action={<Link href="/admin/amenities" className="text-[10px] font-semibold text-brand-600">All</Link>} />
          <div className="border-t border-line">
            {bookingRows.map((b) => (
              <div key={b.booking.id} className="flex items-center gap-2.5 border-b border-line/70 px-5 py-2.5 last:border-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blush-50 text-center"><span className="text-[6.5px] font-bold uppercase text-blush-500">{formatDate(b.booking.date, { month: "short" })}</span><span className="text-[10px] font-bold leading-none text-ink">{new Date(b.booking.date + "T00:00").getDate()}</span></div>
                <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-ink">{b.amenity}</p><p className="text-[8.5px] text-muted">Home {b.unit} · {b.booking.startTime}–{b.booking.endTime}</p></div>
              </div>
            ))}
            {!bookingRows.length ? <p className="px-5 py-6 text-center text-[10px] text-muted">No upcoming bookings.</p> : null}
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-[#fbfcff] to-brand-50/50">
          <div className="p-5">
            <div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-white text-brand-600 shadow-sm"><Zap className="size-4" /></span><Badge variant="blue">Quick actions</Badge></div>
            <p className="mt-3 text-[12.5px] font-semibold text-ink">Keep the day moving</p>
            <div className="mt-3 space-y-2">
              {[
                { l: "Run the monthly billing", h: "/admin/billing", icon: Wallet },
                { l: "Review helpdesk SLAs", h: "/admin/helpdesk", icon: Wrench },
                { l: "Publish a notice", h: "/admin/communications", icon: MegaphoneIcon },
                { l: "Export the audit pack", h: "/admin/reports", icon: ScrollIcon },
              ].map((a) => <Link key={a.l} href={a.h} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 text-[10px] font-medium text-ink-soft transition-colors hover:border-brand-200 hover:text-ink"><a.icon className="size-3.5 text-brand-500" /><span className="flex-1">{a.l}</span><ChevronRight className="size-3 text-muted" /></Link>)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MessageIcon() { return <Wrench className="size-3.5" />; }
function MegaphoneIcon() { return <BellRing className="size-3.5" />; }
function ScrollIcon() { return <CheckCircle2 className="size-3.5" />; }
