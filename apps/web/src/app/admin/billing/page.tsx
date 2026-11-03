import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BadgeCheck, CheckCircle2, ChevronRight, IndianRupee,
  Landmark, Receipt, Search, TrendingDown, TrendingUp, Wallet, X, XCircle,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { CollectionsChart } from "@/components/admin/collections-chart";
import { AddHeadDialog, ExpenseDialog, RunBillingDialog } from "@/components/admin/billing-dialogs";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { billingHeads, expenses, invoices, payments, units, users, vendors } from "@/db/schema";
import { verifyPayment } from "@/lib/actions/billing";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tabs = [
  { v: "overview", l: "Overview" }, { v: "invoices", l: "Invoices" }, { v: "payments", l: "Payments" },
  { v: "expenses", l: "Expenses" }, { v: "heads", l: "Billing heads" },
];

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; q?: string }> }) {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const params = await searchParams;
  const tab = params.tab ?? "overview";
  const status = params.status ?? "all";
  const q = (params.q ?? "").toLowerCase();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const start6 = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const [headRows, invoiceRows, paymentRows, expenseRows, vendorRows, pendingRows] = await Promise.all([
    db.select().from(billingHeads).where(and(eq(billingHeads.societyId, societyId), eq(billingHeads.active, true))).orderBy(billingHeads.sortOrder),
    db.select({ invoice: invoices, unit: units.number }).from(invoices).innerJoin(units, eq(invoices.unitId, units.id)).where(eq(invoices.societyId, societyId)).orderBy(desc(invoices.issueDate)),
    db.select({ payment: payments, unit: units.number, user: users.name }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).leftJoin(users, eq(payments.userId, users.id)).where(eq(payments.societyId, societyId)).orderBy(desc(payments.createdAt)),
    db.select({ expense: expenses, vendor: vendors.name }).from(expenses).leftJoin(vendors, eq(expenses.vendorId, vendors.id)).where(eq(expenses.societyId, societyId)).orderBy(desc(expenses.date)),
    db.select().from(vendors).where(and(eq(vendors.societyId, societyId), eq(vendors.status, "active"))).orderBy(vendors.name),
    db.select({ payment: payments, unit: units.number, user: users.name }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).leftJoin(users, eq(payments.userId, users.id)).where(and(eq(payments.societyId, societyId), eq(payments.status, "pending"))).orderBy(desc(payments.createdAt)),
  ]);
  const collectedThisMonth = paymentRows.filter((p) => p.payment.status === "success" && p.payment.paidAt >= monthStart).reduce((s, p) => s + p.payment.amount, 0);
  const outstanding = invoiceRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.invoice.status)).reduce((s, i) => s + i.invoice.total - i.invoice.amountPaid, 0);
  const outstandingCount = invoiceRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.invoice.status)).length;
  const spentThisMonth = expenseRows.filter((e) => e.expense.createdAt >= monthStart).reduce((s, e) => s + e.expense.amount, 0);
  const monthly = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      collected: paymentRows.filter((p) => p.payment.status === "success" && p.payment.paidAt.toISOString().slice(0, 7) === key).reduce((s, p) => s + p.payment.amount, 0) / 100,
      expenses: expenseRows.filter((e) => e.expense.date.slice(0, 7) === key).reduce((s, e) => s + e.expense.amount, 0) / 100,
    };
  });
  const filteredInvoices = invoiceRows.filter((i) => (status === "all" || i.invoice.status === status) && (!q || i.unit.includes(q) || i.invoice.number.toLowerCase().includes(q) || i.invoice.title.toLowerCase().includes(q)));
  const filteredPayments = paymentRows.filter((p) => (status === "all" || p.payment.status === status));
  const categoryTotals = Object.entries(expenseRows.reduce<Record<string, number>>((acc, e) => { acc[e.expense.category] = (acc[e.expense.category] ?? 0) + e.expense.amount; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = Math.max(1, ...categoryTotals.map((c) => c[1]));

  return (
    <div>
      <PageHeader eyebrow="Money" title="Billing & accounts" description="Invoices, collections, expenses and a clean audit trail. Built for treasurers, reviewed by auditors." actions={<>
        <RunBillingDialog heads={headRows} />
        <ExpenseDialog vendors={vendorRows.map((v) => ({ id: v.id, name: v.name }))} />
        <a href="/api/admin/export?type=invoices" className="hidden h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[11px] font-semibold text-ink-soft hover:bg-canvas sm:inline-flex"><ArrowDownToLine className="size-3.5" /> Export</a>
      </>} />

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Collected this month" value={formatINR(collectedThisMonth)} hint="Successful payments" tone="green" icon={<TrendingUp className="size-4" />} />
        <Stat label="Outstanding" value={formatINR(outstanding)} hint={`${outstandingCount} open invoices`} tone="pink" icon={<Wallet className="size-4" />} />
        <Stat label="Expenses this month" value={formatINR(spentThisMonth)} hint={`${expenseRows.filter((e) => e.expense.createdAt >= monthStart).length} entries`} icon={<TrendingDown className="size-4" />} />
        <Stat label="Net position" value={formatINR(collectedThisMonth - spentThisMonth)} hint="Collections minus expenses" tone="blue" icon={<Landmark className="size-4" />} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">{tabs.map((t) => <Link key={t.v} href={`/admin/billing?tab=${t.v}`} className={`rounded-full border px-3.5 py-2 text-[11px] font-semibold ${tab === t.v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}>{t.l}</Link>)}</div>

      {tab === "overview" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Cash flow" description="Collections and expenses" icon={<TrendingUp className="size-4" />} />
            <div className="flex items-center gap-4 px-5 pb-2"><span className="flex items-center gap-1.5 text-[9px] text-muted"><span className="size-2 rounded-full bg-brand-500" /> Collected</span><span className="flex items-center gap-1.5 text-[9px] text-muted"><span className="size-2 rounded-full bg-blush-400" /> Spent</span></div>
            <div className="px-2 pb-4 pr-4"><CollectionsChart data={monthly} /></div>
          </Card>
          <Card>
            <CardHeader title="Verification queue" description={`${pendingRows.length} offline payments`} icon={<BadgeCheck className="size-4" />} />
            <div className="border-t border-line">
              {pendingRows.slice(0, 5).map((p) => (
                <div key={p.payment.id} className="border-b border-line/70 px-4 py-3 last:border-0">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-ink">{formatINR(p.payment.amount)} · {p.payment.method.toUpperCase()}</p><span className="text-[8px] text-muted">{timeAgo(p.payment.createdAt)}</span></div>
                  <p className="text-[8.5px] text-muted">{p.user} · Home {p.unit} · {p.payment.reference}</p>
                  <div className="mt-1.5 flex gap-1.5">
                    <form action={verifyPayment}><input type="hidden" name="paymentId" value={p.payment.id} /><input type="hidden" name="decision" value="approve" /><button className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-1 text-[8px] font-bold text-mint-600"><CheckCircle2 className="size-2.5" /> Verify</button></form>
                    <form action={verifyPayment}><input type="hidden" name="paymentId" value={p.payment.id} /><input type="hidden" name="decision" value="reject" /><button className="inline-flex items-center gap-1 rounded-full bg-[#fdeced] px-2 py-1 text-[8px] font-bold text-[#c43d4d]"><XCircle className="size-2.5" /> Reject</button></form>
                  </div>
                </div>
              ))}
              {!pendingRows.length ? <div className="px-4 py-8 text-center"><CheckCircle2 className="mx-auto size-5 text-mint-600" /><p className="mt-1.5 text-[10px] font-semibold text-ink">Queue is clear</p><p className="text-[8.5px] text-muted">No offline payments to verify.</p></div> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Top outstanding" description="Homes to follow up with" icon={<Wallet className="size-4" />} />
            <div className="border-t border-line">{invoiceRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.invoice.status)).sort((a, b) => (b.invoice.total - b.invoice.amountPaid) - (a.invoice.total - a.invoice.amountPaid)).slice(0, 6).map((i) => <div key={i.invoice.id} className="flex items-center justify-between border-b border-line/70 px-4 py-2.5 last:border-0"><div><p className="text-[10px] font-semibold text-ink">Home {i.unit}</p><p className="text-[8px] text-muted">{i.invoice.number}</p></div><span className="text-[10px] font-semibold text-[#c43d4d]">{formatINR(i.invoice.total - i.invoice.amountPaid)}</span></div>)}</div>
          </Card>
          <Card>
            <CardHeader title="Expenses by category" description="Lifetime, top categories" icon={<IndianRupee className="size-4" />} />
            <div className="border-t border-line px-4 py-4"><div className="space-y-2.5">{categoryTotals.map(([c, amount]) => <div key={c}><div className="flex justify-between text-[9px]"><span className="text-ink-soft">{c}</span><span className="font-semibold text-ink">{formatINR(amount)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[#eef1f8]"><div className="h-full rounded-full bg-blush-300" style={{ width: `${(amount / maxCat) * 100}%` }} /></div></div>)}</div></div>
          </Card>
          <Card>
            <CardHeader title="Recent payments" description="Latest activity" icon={<Receipt className="size-4" />} action={<Link href="/admin/billing?tab=payments" className="text-[10px] font-semibold text-brand-600">All</Link>} />
            <div className="border-t border-line">{paymentRows.slice(0, 6).map((p) => <div key={p.payment.id} className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><div className="min-w-0"><p className="truncate text-[9.5px] font-semibold text-ink">{p.user ?? "Admin"} · Home {p.unit}</p><p className="text-[8px] text-muted">{p.payment.method.toUpperCase()} · {timeAgo(p.payment.createdAt)}</p></div><div className="text-right"><p className="text-[9.5px] font-semibold text-ink">{formatINR(p.payment.amount)}</p><span className={`text-[7.5px] font-semibold ${p.payment.status === "success" ? "text-mint-600" : p.payment.status === "refunded" ? "text-muted" : "text-amber-ink"}`}>{p.payment.status}</span></div></div>)}</div>
          </Card>
        </div>
      ) : null}

      {tab === "invoices" ? (
        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">{["all", "due", "overdue", "partially_paid", "paid"].map((s) => <Link key={s} href={`/admin/billing?tab=invoices&status=${s}`} className={`rounded-full px-2.5 py-1.5 text-[9px] font-semibold capitalize ${status === s ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>{s.replace("_", " ")}</Link>)}</div>
            <form action="/admin/billing" className="flex h-8 items-center gap-2 rounded-full border border-line px-3 sm:w-60"><input type="hidden" name="tab" value="invoices" /><Search className="size-3 text-muted" /><input name="q" defaultValue={params.q} placeholder="Search invoice or home…" className="w-full bg-transparent text-[10px] outline-none placeholder:text-muted" /></form>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="bg-[#fbfcff]">{["Invoice", "Home", "Period", "Due", "Total", "Paid", "Status"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{filteredInvoices.slice(0, 80).map(({ invoice: i, unit }) => <tr key={i.id} className="border-b border-line/70 last:border-0 hover:bg-[#fbfcff]"><td className="px-4 py-2.5"><p className="text-[9.5px] font-semibold text-ink">{i.number}</p><p className="text-[8px] text-muted">{i.title}</p></td><td className="px-4 py-2.5 text-[9.5px] font-medium text-ink">{unit}</td><td className="px-4 py-2.5 text-[8.5px] text-muted">{i.periodStart} → {i.periodEnd}</td><td className="px-4 py-2.5 text-[8.5px] text-muted">{formatDate(i.dueDate)}</td><td className="px-4 py-2.5 text-[9.5px] font-semibold text-ink">{formatINR(i.total)}</td><td className="px-4 py-2.5 text-[9px] text-muted">{formatINR(i.amountPaid)}</td><td className="px-4 py-2.5"><Badge variant={i.status === "paid" ? "success" : i.status === "overdue" ? "danger" : i.status === "partially_paid" ? "warning" : "blue"}>{i.status.replace("_", " ")}</Badge></td></tr>)}</tbody></table></div>
          {!filteredInvoices.length ? <EmptyState title="No invoices match" /> : null}
        </Card>
      ) : null}

      {tab === "payments" ? (
        <Card className="mt-4 overflow-hidden">
          <div className="flex flex-wrap gap-1.5 border-b border-line p-4">{["all", "success", "pending", "rejected", "refunded"].map((s) => <Link key={s} href={`/admin/billing?tab=payments&status=${s}`} className={`rounded-full px-2.5 py-1.5 text-[9px] font-semibold capitalize ${status === s ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>{s}</Link>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="bg-[#fbfcff]">{["Receipt", "Home", "Resident", "Amount", "Method", "Status", "Date", "Action"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{filteredPayments.slice(0, 80).map(({ payment: p, unit, user }) => <tr key={p.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><p className="text-[9px] font-semibold text-ink">{p.receiptNo}</p><p className="text-[8px] text-muted">{p.kind}</p></td><td className="px-4 py-2.5 text-[9.5px] font-medium text-ink">{unit ?? "—"}</td><td className="px-4 py-2.5 text-[9px] text-ink-soft">{user ?? "—"}</td><td className="px-4 py-2.5 text-[9.5px] font-semibold text-ink">{formatINR(p.amount)}</td><td className="px-4 py-2.5 text-[8.5px] uppercase text-muted">{p.method}</td><td className="px-4 py-2.5"><Badge variant={p.status === "success" ? "success" : p.status === "pending" ? "warning" : p.status === "refunded" ? "neutral" : "danger"}>{p.status}</Badge></td><td className="px-4 py-2.5 text-[8.5px] text-muted">{formatDate(p.paidAt)}</td><td className="px-4 py-2.5">{p.status === "pending" ? <div className="flex gap-1"><form action={verifyPayment}><input type="hidden" name="paymentId" value={p.id} /><input type="hidden" name="decision" value="approve" /><button className="rounded-full bg-mint-50 px-1.5 py-0.5 text-[7.5px] font-bold text-mint-600">Verify</button></form><form action={verifyPayment}><input type="hidden" name="paymentId" value={p.id} /><input type="hidden" name="decision" value="reject" /><button className="rounded-full bg-[#fdeced] px-1.5 py-0.5 text-[7.5px] font-bold text-[#c43d4d]">Reject</button></form></div> : p.status === "success" ? <Link href={`/app/payments/receipts/${p.id}`} className="text-[8px] font-semibold text-brand-600">Receipt</Link> : null}</td></tr>)}</tbody></table></div>
        </Card>
      ) : null}

      {tab === "expenses" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2 overflow-hidden">
            <CardHeader title="Expenses" description="Every outflow, categorised" icon={<IndianRupee className="size-4" />} action={<ExpenseDialog vendors={vendorRows.map((v) => ({ id: v.id, name: v.name }))} />} />
            <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[620px]"><thead><tr className="bg-[#fbfcff]">{["Description", "Category", "Vendor", "Date", "Amount", "Status"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{expenseRows.slice(0, 60).map(({ expense: e, vendor }) => <tr key={e.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><p className="text-[9.5px] font-medium text-ink">{e.description}</p><p className="text-[8px] text-muted">{e.invoiceRef ?? "—"}</p></td><td className="px-4 py-2.5 text-[8.5px] text-muted">{e.category}</td><td className="px-4 py-2.5 text-[8.5px] text-muted">{vendor ?? "—"}</td><td className="px-4 py-2.5 text-[8.5px] text-muted">{formatDate(e.date)}</td><td className="px-4 py-2.5 text-[9.5px] font-semibold text-ink">{formatINR(e.amount)}</td><td className="px-4 py-2.5"><Badge variant={e.status === "paid" ? "success" : e.status === "pending" ? "warning" : "outline"}>{e.status}</Badge></td></tr>)}</tbody></table></div>
          </Card>
          <div className="space-y-4">
            <Card><CardHeader title="By category" description="Lifetime totals" icon={<Wallet className="size-4" />} /><div className="border-t border-line px-4 py-4"><div className="space-y-2.5">{categoryTotals.map(([c, amount]) => <div key={c}><div className="flex justify-between text-[9px]"><span className="text-ink-soft">{c}</span><span className="font-semibold text-ink">{formatINR(amount)}</span></div><div className="mt-1 h-1.5 rounded-full bg-[#eef1f8]"><div className="h-full rounded-full bg-blush-300" style={{ width: `${(amount / maxCat) * 100}%` }} /></div></div>)}</div></div></Card>
            <div className="rounded-[18px] bg-gradient-to-br from-[#fbfcff] to-mint-50 p-4"><p className="text-[11px] font-semibold text-ink">Audit-ready by default</p><p className="mt-1 text-[9.5px] leading-relaxed text-muted">Every expense carries who recorded it and when. Exports include the full ledger for your auditor.</p><a href="/api/admin/export?type=payments" className="mt-2 inline-flex text-[9.5px] font-semibold text-brand-600">Export payments →</a></div>
          </div>
        </div>
      ) : null}

      {tab === "heads" ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between"><p className="text-[11px] text-muted">These heads appear when you run billing. Amounts are in rupees.</p><AddHeadDialog /></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {headRows.map((h) => <Card key={h.id} className="p-4"><div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Wallet className="size-4" /></span><Badge variant={h.basis === "per_sqft" ? "blue" : "outline"}>{h.basis.replace("_", " ")}</Badge></div><p className="mt-3 text-[12px] font-semibold text-ink">{h.name}</p><p className="text-[9px] text-muted">{h.code} · {h.description ?? "Recurring charge"}</p><div className="mt-3 flex items-end justify-between border-t border-line pt-2.5"><div><p className="text-[8px] uppercase tracking-wide text-muted">Default</p><p className="text-[14px] font-semibold text-ink">{h.basis === "per_sqft" ? `₹${(h.defaultAmount / 100).toFixed(2)}` : formatINR(h.defaultAmount)}</p><p className="text-[7.5px] text-muted">{h.basis === "per_sqft" ? "per sq ft" : "per home"}</p></div><span className="text-[8px] text-muted">GST {h.gstRate}%</span></div></Card>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
