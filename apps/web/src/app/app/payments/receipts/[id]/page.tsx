import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PrintButton } from "./print-button";
import { LogoMark } from "@/components/brand/logo";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { invoiceItems, invoices, payments } from "@/db/schema";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Receipt" };

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireResident();
  const { id } = await params;
  let [payment] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.unitId, ctx.unit.id))).limit(1);
  let invoice = null as typeof invoices.$inferSelect | null;
  if (payment?.invoiceId) {
    [invoice] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).limit(1);
  } else if (!payment) {
    [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.unitId, ctx.unit.id))).limit(1);
    if (invoice) {
      [payment] = await db.select().from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "success"))).orderBy(desc(payments.paidAt)).limit(1);
    }
  }
  if (!invoice && !payment) notFound();
  const items = invoice ? await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)) : [];
  const total = invoice?.total ?? payment.amount;
  const receiptNo = payment?.receiptNo ?? invoice?.number ?? "—";
  const paidAmount = payment?.amount ?? invoice?.amountPaid ?? 0;

  return (
    <div className="receipt-page mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between print:hidden">
        <Link href="/app/payments" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Back to payments</Link>
        <PrintButton />
      </div>
      <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-soft print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-line px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <LogoMark size={42} />
            <div><p className="text-[16px] font-extrabold tracking-[-0.04em] text-ink">nivaasa<span className="text-blush-400">.</span></p><p className="text-[9px] text-muted">Community, in one place</p></div>
          </div>
          <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Payment receipt</p><p className="mt-1 text-[11.5px] font-semibold text-ink">{receiptNo}</p><p className="text-[9px] text-muted">{formatDate(payment?.paidAt ?? invoice?.createdAt)}</p></div>
        </div>
        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Received from</p>
            <p className="mt-1.5 text-[13px] font-semibold text-ink">{ctx.user.name}</p>
            <p className="text-[10px] text-muted">Home {ctx.unit.number} · {ctx.society.name}</p>
            <p className="text-[9.5px] text-muted">{ctx.society.address}, {ctx.society.city}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Paid to</p>
            <p className="mt-1.5 text-[13px] font-semibold text-ink">{ctx.society.name} RWA</p>
            <p className="text-[9.5px] text-muted">Reg. {ctx.society.registrationNo ?? "—"}</p>
            <p className="text-[9.5px] text-muted">GSTIN {ctx.society.gstin ?? "Not applicable"}</p>
          </div>
        </div>
        <div className="px-6 sm:px-8">
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="grid grid-cols-[1fr_auto] bg-[#fbfcff] px-4 py-2.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-muted"><span>Description</span><span>Amount</span></div>
            {invoice && items.length ? items.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_auto] border-t border-line/70 px-4 py-2.5 text-[11px]"><div><p className="font-medium text-ink">{i.description}</p><p className="text-[9px] text-muted">{i.quantity > 1 ? `${i.quantity} × ₹${(i.rate / 100).toFixed(2)}` : `Invoice ${invoice.number}`}</p></div><p className="font-semibold text-ink">{formatINR(i.amount)}</p></div>
            )) : (
              <div className="grid grid-cols-[1fr_auto] border-t border-line/70 px-4 py-3 text-[11px]"><div><p className="font-medium text-ink">{payment?.kind === "amenity" ? "Amenity booking" : payment?.invoiceId ? "Maintenance payment" : "Advance payment"}</p><p className="text-[9px] text-muted">{payment?.note}</p></div><p className="font-semibold text-ink">{formatINR(total)}</p></div>
            )}
            {invoice && invoice.penalty ? <div className="grid grid-cols-[1fr_auto] border-t border-line/70 px-4 py-2 text-[10px] text-[#c43d4d]"><span>Late payment fee</span><span>{formatINR(invoice.penalty)}</span></div> : null}
          </div>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="rounded-xl bg-canvas px-3.5 py-2.5 text-[9.5px] text-muted">
            <p><span className="font-semibold text-ink-soft">Method</span> · {(payment?.method ?? "upi").toUpperCase()}</p>
            <p className="mt-0.5"><span className="font-semibold text-ink-soft">Reference</span> · {payment?.reference ?? "—"}</p>
            <p className="mt-0.5"><span className="font-semibold text-ink-soft">Date</span> · {formatDateTime(payment?.paidAt ?? invoice?.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <Badge variant="success"><CheckCircle2 className="size-3" /> Paid</Badge>
            <div className="text-right"><p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Amount received</p><p className="text-[24px] font-semibold tracking-[-0.03em] text-ink">{formatINR(paidAmount)}</p>{invoice && paidAmount < total ? <p className="text-[9px] text-muted">of {formatINR(total)}</p> : null}</div>
          </div>
        </div>
        <div className="border-t border-line bg-[#fbfcff] px-6 py-4 text-center text-[8.5px] leading-relaxed text-muted sm:px-8">
          This is a computer-generated receipt from Nivaasa for {ctx.society.name}. For queries, raise a helpdesk request or write to the society accounts team. · {receiptNo}
        </div>
      </div>
    </div>
  );
}
