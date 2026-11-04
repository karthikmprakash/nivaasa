import { QueryTabs } from "@/components/ui/query-tabs";
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
import { invoiceItems, invoices, payments } from "@/db/schema";
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
  const now = new Date();
  const financialYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const yearStart = new Date(`${financialYear}-04-01T00:00:00+05:30`);
  const paidThisYear = paymentsRows.filter((p) => p.status === "success" && p.paidAt >= yearStart).reduce((s, p) => s + p.amount, 0);
  const pendingInvoiceIds = new Set(paymentsRows.filter((p) => p.status === "pending" && p.invoiceId).map((p) => p.invoiceId));
  const dueInvoices = invoicesRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.status));
  const oldestDue = dueInvoices[dueInvoices.length - 1];
  const latestInvoice = invoicesRows[0] ?? null;
  const breakdown = latestInvoice
    ? await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, latestInvoice.id))
    : [];
  const fy = `${financialYear}–${String(financialYear + 1).slice(-2)}`;
  const bankAccount = ctx.society.bankAccount?.replace(/\s/g, "") ?? "";
  const bankName = ctx.society.bankName ?? "Society bank account";
  const bankLine = bankAccount ? `${bankName} · ••${bankAccount.slice(-4)}${ctx.society.ifsc ? ` · ${ctx.society.ifsc}` : ""}` : null;

  return (
    <div>
      <PageHeader
        eyebrow="Money, clearly"
        title="Payments"
        description="Your maintenance, water and clubhouse charges — pay online, record an offline payment, or download a statement. No surprises."
        actions={<a href="/api/export/statement" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-body font-semibold text-ink-soft hover:bg-canvas"><ArrowDownToLine className="size-4" /> Statement</a>}
      />

      <div className="mt-5 grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="relative min-w-0 overflow-hidden rounded-panel border border-brand-200 bg-brand-50/70 p-4 text-ink sm:p-6">
          <div className="relative grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-caption font-bold uppercase tracking-[0.12em] text-ink-soft">FY {fy}</span>{dues.overdue ? <span className="rounded-full bg-amber-soft px-2 py-1 text-caption font-bold text-amber-ink">{dues.overdue} overdue</span> : null}</div>
              <p className="mt-3 text-body font-medium text-ink-soft">Total outstanding</p>
              <p className="mt-1 break-words text-[clamp(1.75rem,6vw,2.25rem)] font-semibold tracking-[-0.04em]">{formatINR(dues.total)}</p>
              <p className="mt-1 text-body text-ink-soft">{dues.count} open {dues.count === 1 ? "invoice" : "invoices"} · {ctx.unit.number}</p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4">
              <div><p className="text-caption font-semibold uppercase tracking-wide text-muted">Advance</p><p className="mt-0.5 text-section font-semibold">{formatINR(advance)}</p>{advance === 0 ? <AdvanceButton advance={advance} /> : null}</div>
              <div><p className="text-caption font-semibold uppercase tracking-wide text-muted">Paid this year</p><p className="mt-0.5 text-section font-semibold">{formatINR(paidThisYear)}</p></div>
              {oldestDue ? <PayNowButton invoice={oldestDue} className="col-span-2 w-full bg-white text-brand-700 shadow-none hover:bg-brand-50 sm:col-span-1 sm:w-auto" label={dues.overdue ? "Pay overdue" : "Pay now"} /> : null}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-line bg-white p-4"><CreditCard className="size-4 text-brand-600" /><p className="mt-3 text-caption font-semibold uppercase tracking-wide text-muted">Next due date</p><p className="mt-0.5 text-body font-semibold text-ink">{oldestDue ? formatDate(oldestDue.dueDate, { day: "numeric", month: "short" }) : "All clear"}</p><p className="mt-0.5 text-caption text-muted">{oldestDue ? "Oldest unpaid invoice" : "No invoices outstanding"}</p></div>
          <div className="rounded-[18px] border border-line bg-white p-4"><ShieldCheck className="size-4 text-mint-600" /><p className="mt-3 text-caption font-semibold uppercase tracking-wide text-muted">Receipts</p><p className="mt-0.5 text-body font-semibold text-ink">Instant</p><p className="mt-0.5 text-caption text-muted">Every successful payment</p></div>
          <div className="col-span-2 rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-caption font-semibold text-ink">Need help with a payment?</p><Link href="/app/helpdesk/new" className="text-caption font-semibold text-brand-600">Contact accounts →</Link></div>
            <p className="mt-1 text-caption text-muted">Raise a request with your transaction reference and we&apos;ll trace it.</p>
          </div>
        </div>
      </div>

      <QueryTabs className="mt-5" label="Payment views" basePath="/app/payments" value={tab} items={[
        { value: "invoices", label: "Invoices", count: invoicesRows.length },
        { value: "history", label: "Payment history", count: paymentsRows.filter((p) => p.status !== "pending").length },
        { value: "pending", label: "Verifications", count: paymentsRows.filter((p) => p.status === "pending").length },
      ]} />

      {tab === "invoices" ? (
        <div className="mt-4 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
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
                        <div className="flex flex-wrap items-center gap-1.5"><p className="text-body font-semibold text-ink">{inv.title}</p><Badge variant={meta.variant}>{meta.label}</Badge>{pending ? <Badge variant="warning">Verification pending</Badge> : null}</div>
                        <p className="mt-0.5 text-caption text-muted">{inv.number} · Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}</p>
                        {inv.penalty ? <p className="mt-1 text-caption font-medium text-[#c43d4d]">Includes late fee {formatINR(inv.penalty)}</p> : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right"><p className="text-base font-semibold tracking-[-0.02em] text-ink">{formatINR(inv.total)}</p>{inv.amountPaid > 0 && inv.status !== "paid" ? <p className="text-caption text-muted">{formatINR(inv.amountPaid)} paid</p> : null}</div>
                      <div className="flex items-center gap-1">
                        {["due", "overdue", "partially_paid"].includes(inv.status) ? (
                          <>
                            <PaidOfflineButton invoice={inv} />
                            <PayNowButton invoice={inv} />
                          </>
                        ) : inv.status === "paid" ? (
                          <Link href={`/app/payments/receipts/${inv.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-caption font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-700"><FileText className="size-4" /> Receipt</Link>
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
              <CardHeader title="What you're paying for" description={latestInvoice ? `${latestInvoice.title} · ${latestInvoice.number}` : "No invoice issued yet"} icon={<Wallet className="size-4" />} />
              <div className="border-t border-line px-5 py-4">
                {breakdown.length ? breakdown.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-caption text-ink-soft">{item.description}</span><span className="text-caption font-semibold text-ink">{formatINR(item.amount)}</span></div>) : <p className="py-3 text-caption text-muted">The committee has not issued a breakdown for this invoice yet.</p>}
                {latestInvoice ? <div className="mt-2 flex items-center justify-between"><span className="text-caption font-semibold text-ink">Total</span><span className="text-body font-semibold text-ink">{formatINR(latestInvoice.total)}</span></div> : null}
                <p className="mt-1 text-caption text-muted">{latestInvoice && latestInvoice.gstAmount > 0 ? `Includes GST of ${formatINR(latestInvoice.gstAmount)}` : "No GST applied"} · amounts are taken from the invoice on record</p>
              </div>
            </Card>
            <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4">
              <div className="flex items-start gap-2"><Info className="mt-0.5 size-4 shrink-0 text-brand-500" /><div><p className="text-caption font-semibold text-ink">Paying by NEFT or cheque?</p><p className="mt-1 text-caption leading-relaxed text-muted">Use “I have paid”, add the reference and the accounts team will verify it. You&apos;ll get a receipt once matched.</p></div></div>
              <div className="mt-3 rounded-lg bg-white px-3 py-2"><p className="text-caption font-semibold uppercase tracking-wide text-muted">Society bank account</p>{bankLine ? <p className="mt-0.5 text-caption font-medium text-ink">{bankLine}</p> : <p className="mt-0.5 text-caption text-muted">Not configured. Ask the community office for transfer details.</p>}</div>
            </div>
            <div className="rounded-[18px] bg-gradient-to-br from-blush-50 to-brand-50 p-4">
              <p className="text-caption font-semibold text-ink">Advance keeps it simple</p>
              <p className="mt-1 text-caption leading-relaxed text-ink-soft">Add money to your advance and the accounts team can adjust it against future invoices. Your balance never expires.</p>
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
                  <div><p className="text-caption font-semibold text-ink">{p.kind === "advance" ? "Advance payment" : p.kind === "amenity" ? "Amenity booking" : "Invoice payment"} <span className="font-normal text-muted">· {p.method.toUpperCase()}</span></p><p className="text-caption text-muted">{p.receiptNo} · {formatDate(p.paidAt)} · {p.reference}</p></div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end"><span className="text-body font-semibold text-ink">{formatINR(p.amount)}</span><Badge variant={p.status === "success" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge><Link href={`/app/payments/receipts/${p.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-caption font-semibold text-ink-soft hover:border-brand-200">View</Link></div>
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
                <div><p className="text-caption font-semibold text-ink">{formatINR(p.amount)} · {p.method.toUpperCase()}</p><p className="text-caption text-muted">{p.receiptNo} · {p.reference} · recorded {formatDate(p.createdAt)}</p><p className="text-caption text-muted">{p.note}</p></div>
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
