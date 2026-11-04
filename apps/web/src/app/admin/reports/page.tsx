import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { ArrowDownToLine, ArrowUpRight, ChartNoAxesCombined, Clock3, DoorOpen, FileSpreadsheet, IndianRupee, ShieldCheck, Star, Users, Wallet, Wrench } from "lucide-react";
import { Badge, Card, CardHeader, ProgressBar, Stat } from "@/components/ui/primitives";
import { CollectionsChart } from "@/components/admin/collections-chart";
import { requireAdminRole, getAdminSnapshot } from "@/lib/queries";
import { db } from "@/db";
import { amenities, amenityBookings, expenses, helpdeskTickets, invoices, payments, units, visitors } from "@/db/schema";
import { communityMonthKey } from "@/lib/datetime";
import { formatDate, formatINR, todayISO } from "@/lib/utils";

export const metadata = { title: "Reports" };

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const ctx = await requireAdminRole(["admin", "manager", "accountant", "committee", "auditor"]);
  const societyId = ctx.society!.id;
  const [snapshot, invoiceRows, paymentRows, expenseRows, ticketRows, visitorRows, bookingRows, unitRows] = await Promise.all([
    getAdminSnapshot(societyId),
    db.select({ invoice: invoices, unit: units.number }).from(invoices).innerJoin(units, eq(invoices.unitId, units.id)).where(eq(invoices.societyId, societyId)),
    db.select().from(payments).where(and(eq(payments.societyId, societyId), eq(payments.status, "success"))),
    db.select().from(expenses).where(eq(expenses.societyId, societyId)),
    db.select().from(helpdeskTickets).where(eq(helpdeskTickets.societyId, societyId)),
    db.select().from(visitors).where(eq(visitors.societyId, societyId)),
    db.select({ booking: amenityBookings, amenity: amenities.name }).from(amenityBookings).innerJoin(amenities, eq(amenityBookings.amenityId, amenities.id)).where(eq(amenityBookings.societyId, societyId)),
    db.select().from(units).where(eq(units.societyId, societyId)),
  ]);
  const [currentYear, currentMonth] = todayISO().split("-").map(Number);
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(currentYear, currentMonth - 1 - (5 - i), 1);
    const key = communityMonthKey(d);
    return {
      month: d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" }),
      collected: paymentRows.filter((p) => communityMonthKey(p.paidAt) === key).reduce((s, p) => s + p.amount, 0) / 100,
      expenses: expenseRows.filter((e) => e.date.slice(0, 7) === key).reduce((s, e) => s + e.amount, 0) / 100,
    };
  });
  const billableInvoices = invoiceRows.filter(({ invoice }) => invoice.status !== "cancelled");
  const totalBilled = billableInvoices.reduce((s, i) => s + i.invoice.total, 0);
  const totalCollected = billableInvoices.reduce((s, i) => s + i.invoice.amountPaid, 0);
  const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const defaulters = billableInvoices.filter((i) => ["overdue", "partially_paid", "due"].includes(i.invoice.status)).reduce<Record<string, number>>((acc, i) => { acc[i.unit] = (acc[i.unit] ?? 0) + (i.invoice.total - i.invoice.amountPaid); return acc; }, {});
  const topDefaulters = Object.entries(defaulters).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const expensesByCategory = Object.entries(expenseRows.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const ticketByCategory = Object.entries(ticketRows.reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const activeBookings = bookingRows.filter(({ booking }) => booking.status !== "cancelled");
  const amenityUsage = Object.entries(activeBookings.reduce<Record<string, number>>((acc, b) => { acc[b.amenity] = (acc[b.amenity] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxExpense = Math.max(1, ...expensesByCategory.map((e) => e[1]));
  const resolved = ticketRows.filter((t) => ["resolved", "closed"].includes(t.status));
  const rated = ticketRows.filter((t) => t.rating);
  const avgRating = rated.length ? (rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  const onlinePayments = paymentRows.filter((p) => p.method !== "cash" && p.method !== "cheque").length;
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-600">Insights</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-ink">Reports</h1><p className="mt-1 text-caption text-ink-soft">The numbers behind your community — ready for the committee, the AGM and the auditor.</p></div>
        <div className="flex flex-wrap gap-2"><a href="/api/admin/export?type=invoices" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-caption font-semibold text-ink-soft"><ArrowDownToLine className="size-4" /> Invoices</a><a href="/api/admin/export?type=payments" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-caption font-semibold text-ink-soft"><ArrowDownToLine className="size-4" /> Payments</a><a href="/api/admin/export?type=residents" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-caption font-semibold text-white"><FileSpreadsheet className="size-4" /> Residents</a></div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Collection rate" value={`${collectionRate}%`} hint={`${formatINR(totalCollected)} of ${formatINR(totalBilled)}`} tone="green" icon={<TrendingUpIcon />} />
        <Stat label="Outstanding" value={formatINR(snapshot.outstanding)} hint={`${snapshot.outstandingCount} invoices`} tone="pink" icon={<Wallet className="size-4" />} />
        <Stat label="Helpdesk closure" value={`${ticketRows.length ? Math.round((resolved.length / ticketRows.length) * 100) : 0}%`} hint={`${resolved.length} closed tickets`} tone="blue" icon={<Wrench className="size-4" />} />
        <Stat label="Resident satisfaction" value={avgRating} hint={`${rated.length} ratings`} icon={<Star className="size-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Income vs expenditure" description="Last six months" icon={<ChartNoAxesCombined className="size-4" />} />
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1"><div className="flex gap-4"><span className="flex items-center gap-1.5 text-caption text-muted"><span className="size-2 rounded-full bg-brand-500" /> Collections</span><span className="flex items-center gap-1.5 text-caption text-muted"><span className="size-2 rounded-full bg-blush-400" /> Expenses</span></div><span className="text-caption text-muted">Values in ₹</span></div>
          <div className="px-2 pb-4 pr-4"><CollectionsChart data={monthly} /></div>
        </Card>
        <Card>
          <CardHeader title="Monthly summary" description="Collections and spend" icon={<IndianRupee className="size-4" />} />
          <div className="border-t border-line px-4 py-3">
            {monthly.map((m) => <div key={m.month} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-caption font-medium text-ink-soft">{m.month}</span><div className="flex items-center gap-3"><span className="text-caption text-mint-600">{formatINR(m.collected)}</span><span className="text-caption text-blush-500">{formatINR(m.expenses)}</span></div></div>)}
            <div className="mt-2 flex items-center justify-between"><span className="text-caption font-semibold text-ink">Net</span><span className="text-caption font-semibold text-ink">{formatINR(monthly.reduce((s, m) => s + m.collected - m.expenses, 0))}</span></div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Defaulters" description="Homes with outstanding dues" icon={<Wallet className="size-4" />} action={<a href="/api/admin/export?type=invoices" className="text-caption font-semibold text-brand-600">Export</a>} />
          <div className="border-t border-line">{topDefaulters.map(([unit, amount], i) => <div key={unit} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><span className="grid size-5 place-items-center rounded bg-canvas text-caption font-bold text-muted">{i + 1}</span><span className="flex-1 text-caption font-medium text-ink">Home {unit}</span><span className="text-caption font-semibold text-[#c43d4d]">{formatINR(amount)}</span></div>)}{!topDefaulters.length ? <p className="px-4 py-6 text-center text-caption text-muted">No outstanding dues.</p> : null}</div>
        </Card>
        <Card>
          <CardHeader title="Expenses by category" description="Where the money goes" icon={<IndianRupee className="size-4" />} />
          <div className="border-t border-line px-4 py-4"><div className="space-y-2.5">{expensesByCategory.slice(0, 6).map(([c, amount]) => <div key={c}><div className="flex justify-between text-caption"><span className="text-ink-soft">{c}</span><span className="font-semibold text-ink">{formatINR(amount)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[#eef1f8]"><div className="h-full rounded-full bg-blush-300" style={{ width: `${(amount / maxExpense) * 100}%` }} /></div></div>)}</div></div>
        </Card>
        <Card>
          <CardHeader title="Helpdesk categories" description="What residents ask for" icon={<Wrench className="size-4" />} />
          <div className="border-t border-line px-4 py-4"><div className="space-y-2.5">{ticketByCategory.map(([c, n]) => <div key={c} className="flex items-center justify-between"><span className="text-caption text-ink-soft">{c}</span><div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded-full bg-[#eef1f8]"><div className="h-full rounded-full bg-brand-300" style={{ width: `${(n / Math.max(1, ticketByCategory[0][1])) * 100}%` }} /></div><span className="w-4 text-right text-caption font-semibold text-ink">{n}</span></div></div>)}</div></div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Community operations" description="Gate, amenities and occupancy" icon={<ShieldCheck className="size-4" />} />
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">{[
            { l: "Gate entries", v: visitorRows.filter((visitor) => !!visitor.enteredAt).length, i: DoorOpen },
            { l: "Amenity bookings", v: activeBookings.length, i: CalendarIcon },
            { l: "Occupied homes", v: `${unitRows.filter((u) => u.status === "occupied").length}/${unitRows.length}`, i: Users },
            { l: "Online payments", v: `${paymentRows.length ? Math.round((onlinePayments / paymentRows.length) * 100) : 0}%`, i: Wallet },
          ].map((s) => <div key={s.l} className="bg-white px-4 py-4"><s.i className="size-3.5 text-brand-500" /><p className="mt-2 text-[16px] font-semibold text-ink">{s.v}</p><p className="text-caption text-muted">{s.l}</p></div>)}</div>
          <div className="border-t border-line p-4"><div className="grid gap-4 sm:grid-cols-2"><div><div className="flex justify-between text-caption"><span className="text-muted">Collection efficiency</span><span className="font-semibold text-ink">{collectionRate}%</span></div><ProgressBar value={collectionRate} tone="green" className="mt-1.5" /></div><div><div className="flex justify-between text-caption"><span className="text-muted">Helpdesk satisfaction</span><span className="font-semibold text-ink">{avgRating} / 5</span></div><ProgressBar value={(Number(avgRating) || 0) * 20} tone="pink" className="mt-1.5" /></div></div></div>
        </Card>
        <Card>
          <CardHeader title="Amenity usage" description="Most-loved spaces" icon={<CalendarIcon />} />
          <div className="border-t border-line px-4 py-4"><div className="space-y-2">{amenityUsage.map(([a, n]) => <div key={a} className="flex items-center justify-between"><span className="text-caption text-ink-soft">{a}</span><span className="text-caption font-semibold text-ink">{n} bookings</span></div>)}</div></div>
        </Card>
      </div>
    </div>
  );
}

function TrendingUpIcon() { return <ChartNoAxesCombined className="size-4" />; }
function CalendarIcon() { return <Clock3 className="size-4" />; }
