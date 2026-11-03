import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, Banknote, CalendarClock, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, CreditCard, FileText, Info, Receipt, ShieldCheck, Wallet,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AdvanceButton, PaidOfflineButton, PayNowButton } from "@/components/app/payment-dialogs";
import { requireResident, getDuesSummary } from "@/lib/queries";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export const dynamic = "force-dynamic";

const statusMeta: Record<string, { label: string; variant: "success" | "warning" | "danger" | "blue" | "neutral" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "blue" },
  overdue: { label: "Overdue", variant: "danger" },
  partially_paid: { label: "Part paid", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const tab = params.tab ?? "invoices";
  const [dues, invoicesRows, paymentsRows] = await Promise.all([
    getDuesSummary(ctx.unit.id, ctx.society.id),
    db.select().from(invoices).where(eq(invoices.unitId, ctx.unit.id)).orderBy(desc(invoices.issueDate)),
    db.select().from(payments).where(eq(payments.unitId, ctx.unit.id)).orderBy(desc(payments.createdAt)),
  ]);
  const advance = paymentsRows.filter((p) => p.kind === "advance" && p.status === "success").reduce((s, p) => s + p.amount, 0);
  const paidThisYear = paymentsRows.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const pendingInvoiceIds = new Set(paymentsRows.filter((p) => p.status === "pending" && p.invoiceId).map((p) => p.invoiceId));
  const dueInvoices = invoicesRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.status));
  const oldestDue = dueInvoices[dueInvoices.length - 1];
  const fy = "2026–27";

  return (
    <div>
      <PageHeader
        eyebrow="Money, clearly"
        title="Payments"
        description="Your maintenance, water and clubhouse charges — pay online, record an offline payment, or download a statement. No surprises."
        actions={<a href="/api/export/statement" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[12px] font-semibold text-ink-soft hover:bg-canvas"><ArrowDownToLine className="size-3.5" /> Statement</a>}
      />

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.65)] sm:p-6">
          <div className="absolute -right-10 -top-16 size-48 rounded-full border-[24px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/70">FY {fy}</span>{dues.overdue ? <span className="rounded-full bg-blush-400/20 px-2 py-1 text-[8.5px] font-bold text-blush-200">{dues.overdue} overdue</span> : null}</div>
              <p className="mt-3 text-[10px] font-medium text-white/60">Total outstanding</p>
              <p className="mt-1 text-[36px] font-semibold tracking-[-0.04em]">{formatINR(dues.total)}</p>
              <p className="mt-1 text-[10.5px] text-white/55">{dues.count} open {dues.count === 1 ? "invoice" : "invoices"} · {ctx.unit.number}</p>
            </div>
            <div className="flex items-center gap-4">
              <div><p className="text-[8.5px] font-medium uppercase tracking-wide text-white/40">Advance</p><p className="mt-0.5 text-[14px] font-semibold">{formatINR(advance)}</p>{advance === 0 ? <AdvanceButton advance={advance} /> : null}</div>
              <div><p className="text-[8.5px] font-medium uppercase tracking-wide text-white/40">Paid this year</p><p className="mt-0.5 text-[14px] font-semibold">{formatINR(paidThisYear)}</p></div>
              {oldestDue ? <PayNowButton invoice={oldestDue} className="hidden bg-white text-brand-700 shadow-none hover:bg-brand-50 sm:inline-flex" label={dues.overdue ? "Pay overdue" : "Pay now"} /> : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-line bg-white p-4"><CreditCard className="size-4 text-brand-600" /><p className="mt-3 text-[8.5px] font-semibold uppercase tracking-wide text-muted">Auto reminders</p><p className="mt-0.5 text-[12px] font-semibold text-ink">On</p><p className="mt-0.5 text-[9px] text-muted">3 days before due date</p></div>
          <div className="rounded-[18px] border border-line bg-white p-4"><ShieldCheck className="size-4 text-mint-600" /><p className="mt-3 text-[8.5px] font-semibold uppercase tracking-wide text-muted">Receipts</p><p className="mt-0.5 text-[12px] font-semibold text-ink">Instant</p><p className="mt-0.5 text-[9px] text-muted">Every successful payment</p></div>
          <div className="col-span-2 rounded-[18px] border border-line bg-gradient-to-r from-[#fbfcff] to-blush-50/50 p-4">
            <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-ink">Need help with a payment?</p><Link href="/app/helpdesk/new" className="text-[9.5px] font-semibold text-brand-600">Contact accounts →</Link></div>
            <p className="mt-1 text-[9.5px] text-muted">Raise a request with your transaction reference and we&apos;ll trace it.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {[
          { v: "invoices", label: "Invoices", count: invoicesRows.length },
          { v: "history", label: "Payment history", count: paymentsRows.filter((p) => p.status !== "pending").length },
          { v: "pending", label: "Verifications", count: paymentsRows.filter((p) => p.status === "pending").length },
        ].map((t) => <Link key={t.v} href={`/app/payments?tab=${t.v}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11.5px] font-semibold ${tab === t.v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}>{t.label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${tab === t.v ? "bg-white/20" : "bg-canvas"}`}>{t.count}</span></Link>)}
      </div>

      {tab === "invoices" ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="space-y-2.5">
            {invoicesRows.map((inv) => {
              const meta = statusMeta[inv.status] ?? statusMeta.due;
              const pending = pendingInvoiceIds.has(inv.id);
              const balance = inv.total - inv.amountPaid;
              return (
                <Card key={inv.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${inv.status === "paid" ? "bg-mint-50 text-mint-600" : inv.status === "overdue" ? "bg-[#fdeced] text-[#c43d4d]" : inv.status === "partially_paid" ? "bg-amber-soft text-amber-ink" : "bg-brand-50 text-brand-600"}`}>
                        {inv.status === "paid" ? <CheckCircle2 className="size-4" /> : inv.status === "overdue" ? <CircleAlert className="size-4" /> : <Receipt className="size-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5"><p className="text-[12.5px] font-semibold text-ink">{inv.title}</p><Badge variant={meta.variant}>{meta.label}</Badge>{pending ? <Badge variant="warning">Verification pending</Badge> : null}</div>
                        <p className="mt-0.5 text-[9.5px] text-muted">{inv.number} · Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}</p>
                        {inv.penalty ? <p className="mt-1 text-[9px] font-medium text-[#c43d4d]">Includes late fee {formatINR(inv.penalty)}</p> : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right"><p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{formatINR(inv.total)}</p>{inv.amountPaid > 0 && inv.status !== "paid" ? <p className="text-[8.5px] text-muted">{formatINR(inv.amountPaid)} paid</p> : null}</div>
                      <div className="flex items-center gap-1">
                        {["due", "overdue", "partially_paid"].includes(inv.status) ? (
                          <>
                            <PaidOfflineButton invoice={inv} />
                            <PayNowButton invoice={inv} />
                          </>
                        ) : inv.status === "paid" ? (
                          <Link href={`/app/payments/receipts/${inv.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-700"><FileText className="size-3" /> Receipt</Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
            {!invoicesRows.length ? <Card><EmptyState icon={<Receipt className="size-6" />} title="No invoices yet" description="When the committee raises an invoice, it will show up here." /></Card> : null}
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader title="What you're paying for" description="This month's invoice breakdown" icon={<Wallet className="size-4" />} />
              <div className="border-t border-line px-5 py-4">
                {[
                  ["Maintenance (₹3.50 / sq ft)", 318500],
                  ["Sinking fund", 100000],
                  ["Water charges", 40000],
                  ["Security & housekeeping", 60000],
                  ["Clubhouse", 25000],
                  ["Parking", 50000],
                ].map(([l, a]) => <div key={l as string} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-[10px] text-ink-soft">{l}</span><span className="text-[10.5px] font-semibold text-ink">{formatINR(a as number)}</span></div>)}
                <div className="mt-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-ink">Total</span><span className="text-[13px] font-semibold text-ink">{formatINR(593500)}</span></div>
                <p className="mt-1 text-[8.5px] text-muted">GST not applicable · amounts are illustrative of your current plan</p>
              </div>
            </Card>
            <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4">
              <div className="flex items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0 text-brand-500" /><div><p className="text-[10.5px] font-semibold text-ink">Paying by NEFT or cheque?</p><p className="mt-1 text-[9.5px] leading-relaxed text-muted">Use “I have paid”, add the reference and the accounts team will verify it. You&apos;ll get a receipt once matched.</p></div></div>
              <div className="mt-3 rounded-lg bg-white px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-wide text-muted">Society bank account</p><p className="mt-0.5 text-[9.5px] font-medium text-ink">HDFC Bank · ••5678 · HDFC0001234</p></div>
            </div>
            <div className="rounded-[18px] bg-gradient-to-br from-blush-50 to-brand-50 p-4">
              <p className="text-[11px] font-semibold text-ink">Advance keeps it simple</p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-ink-soft">Add money to your advance and we&apos;ll settle future invoices automatically. No last-minute payments, no late fees.</p>
              <div className="mt-3"><AdvanceButton advance={advance} /></div>
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "history" ? (
        <Card className="mt-4 overflow-hidden">
          <CardHeader title="Payment history" description="Successful payments and their receipts" icon={<Receipt className="size-4" />} />
          <div className="border-t border-line">
            {paymentsRows.filter((p) => p.status !== "pending").map((p) => (
              <div key={p.id} className="flex flex-col gap-2 border-b border-line/70 px-5 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className={`grid size-9 place-items-center rounded-xl ${p.status === "success" ? "bg-mint-50 text-mint-600" : "bg-[#fdeced] text-[#c43d4d]"}`}>{p.status === "success" ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}</span>
                  <div><p className="text-[11.5px] font-semibold text-ink">{p.kind === "advance" ? "Advance payment" : p.kind === "amenity" ? "Amenity booking" : "Invoice payment"} <span className="font-normal text-muted">· {p.method.toUpperCase()}</span></p><p className="text-[9.5px] text-muted">{p.receiptNo} · {formatDate(p.paidAt)} · {p.reference}</p></div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-[12px] font-semibold text-ink">{formatINR(p.amount)}</span><Badge variant={p.status === "success" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge><Link href={`/app/payments/receipts/${p.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-[9.5px] font-semibold text-ink-soft hover:border-brand-200">View</Link></div>
              </div>
            ))}
            {!paymentsRows.filter((p) => p.status !== "pending").length ? <EmptyState icon={<Receipt className="size-6" />} title="No payments yet" description="Your payment history and receipts will appear here." /> : null}
          </div>
        </Card>
      ) : null}

      {tab === "pending" ? (
        <Card className="mt-4 overflow-hidden">
          <CardHeader title="Awaiting verification" description="Offline payments you've recorded" icon={<Clock3 className="size-4" />} />
          <div className="border-t border-line">
            {paymentsRows.filter((p) => p.status === "pending").map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5 last:border-0">
                <div><p className="text-[11.5px] font-semibold text-ink">{formatINR(p.amount)} · {p.method.toUpperCase()}</p><p className="text-[9.5px] text-muted">{p.receiptNo} · {p.reference} · recorded {formatDate(p.createdAt)}</p><p className="text-[9px] text-muted">{p.note}</p></div>
                <Badge variant="warning">With accounts</Badge>
              </div>
            ))}
            {!paymentsRows.filter((p) => p.status === "pending").length ? <EmptyState icon={<BadgeCheck className="size-6" />} title="Nothing to verify" description="When you record an offline payment, you can track its verification here." /> : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
