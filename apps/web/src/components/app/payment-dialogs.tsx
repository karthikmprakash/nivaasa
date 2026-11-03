"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight, Banknote, Check, CheckCircle2, CreditCard, IndianRupee, Loader2, LockKeyhole,
  Receipt, ShieldCheck, Smartphone, Wallet,
} from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatINR, todayISO } from "@/lib/utils";

type Invoice = {
  id: string;
  title: string;
  number: string;
  total: number;
  amountPaid: number;
  dueDate: string;
  status: string;
};

const methods = [
  { id: "upi", label: "UPI", icon: Smartphone, hint: "GPay, PhonePe, Paytm" },
  { id: "card", label: "Card", icon: CreditCard, hint: "Credit or debit" },
  { id: "netbanking", label: "Net banking", icon: Banknote, hint: "All major banks" },
];

export function PayNowButton({ invoice, className, label = "Pay now" }: { invoice: Invoice; className?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ receiptNo: string } | null>(null);
  const balance = invoice.total - invoice.amountPaid;

  async function pay() {
    setBusy(true);
    try {
      const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, method, note: `Paid for ${invoice.title}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment failed");
      setDone({ receiptNo: data.receiptNo });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" className={className} onClick={() => { setDone(null); setOpen(true); }} disabled={invoice.status === "paid"}>{label} <ArrowRight className="size-3.5" /></Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { if (done) router.refresh(); setDone(null); } }} title={done ? "Payment successful" : "Pay your maintenance"} description={done ? undefined : `${invoice.title} · ${invoice.number}`} className="max-w-lg">
        {done ? (
          <div className="py-2 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-7" /></span>
            <p className="mt-4 text-[20px] font-semibold text-ink">{formatINR(balance)} paid</p>
            <p className="mt-1 text-[12px] text-muted">Receipt {done.receiptNo} · sent to your notifications</p>
            <div className="mt-5 rounded-2xl border border-line bg-[#fbfcff] p-4 text-left">
              <div className="flex justify-between text-[11px]"><span className="text-muted">Paid for</span><span className="font-semibold text-ink">{invoice.title}</span></div>
              <div className="mt-2 flex justify-between text-[11px]"><span className="text-muted">Method</span><span className="font-semibold text-ink">{methods.find((m) => m.id === method)?.label ?? method}</span></div>
              <div className="mt-2 flex justify-between text-[11px]"><span className="text-muted">Status</span><span className="font-semibold text-mint-600">Success</span></div>
            </div>
            <Button className="mt-5 w-full" onClick={() => { setOpen(false); setDone(null); router.refresh(); }}>Done</Button>
          </div>
        ) : (
          <div>
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
              <p className="text-[10px] font-medium text-white/60">Amount to pay</p>
              <p className="mt-1 text-[32px] font-semibold tracking-[-0.04em]">{formatINR(balance)}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-white/60"><span>{invoice.number}</span><span>Due {new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[12px] font-semibold text-ink-soft">Choose a payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)} className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left ${method === m.id ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-line hover:border-brand-200"}`}>
                    <m.icon className={`size-4 ${method === m.id ? "text-brand-600" : "text-muted"}`} />
                    <span className="text-[10.5px] font-semibold text-ink">{m.label}</span>
                    <span className="text-[8px] leading-none text-muted">{m.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            {method === "upi" ? <Field label="UPI ID" className="mt-4" hint="Demo gateway — any UPI ID is accepted."><Input placeholder="yourname@okhdfcbank" defaultValue="aarav@okhdfcbank" /></Field> : null}
            {method === "card" ? <div className="mt-4 grid grid-cols-2 gap-3"><Field label="Card number"><Input placeholder="4242 4242 4242 4242" inputMode="numeric" /></Field><Field label="Expiry / CVV"><Input placeholder="12/29 · 123" /></Field></div> : null}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-mint-600/20 bg-mint-50 px-3 py-2.5"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-mint-600" /><p className="text-[9.5px] leading-relaxed text-mint-600">Demo environment. No money is moved. In production this connects to Razorpay, Stripe or your UPI provider.</p></div>
            <Button className="mt-4 w-full" size="lg" onClick={pay} disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" /> Processing…</> : <>Pay {formatINR(balance)} <LockKeyhole className="size-3.5" /></>}</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}

export function PaidOfflineButton({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState("neft");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/payments/offline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: invoice.id, method, reference, paidOn, note }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => { setDone(false); setOpen(true); }} className="rounded-lg px-2 py-1 text-[10.5px] font-semibold text-ink-soft hover:bg-canvas">I have paid</button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { if (done) router.refresh(); setDone(false); } }} title={done ? "Sent for verification" : "Record a payment"} description={done ? undefined : `${invoice.number} · ${formatINR(invoice.total - invoice.amountPaid)}`}>
        {done ? (
          <div className="py-2 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-7" /></span>
            <p className="mt-4 text-[18px] font-semibold text-ink">Thanks — we&apos;ll verify it</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">The accounts team will match your reference with the society bank account. You&apos;ll get a notification once the receipt is issued.</p>
            <Button className="mt-5 w-full" onClick={() => { setOpen(false); router.refresh(); }}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Payment method"><Select value={method} onChange={(e) => setMethod(e.target.value)}><option value="neft">NEFT / IMPS</option><option value="cheque">Cheque</option><option value="cash">Cash</option><option value="upi">Direct UPI</option></Select></Field>
              <Field label="Paid on"><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
            </div>
            <Field label="Reference / transaction number" hint="Cheque number, UTR or UPI reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. NEFT/HDFC/88421009" /></Field>
            <Field label="Note for the accounts team"><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional" /></Field>
            {error ? <p className="rounded-lg bg-[#fdeced] px-3 py-2 text-[11px] text-[#c43d4d]">{error}</p> : null}
            <div className="rounded-xl bg-canvas px-3 py-2.5 text-[9.5px] leading-relaxed text-muted">This creates a payment intimation only. The invoice stays outstanding until the accounts team verifies it.</div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" /> Submitting…</> : "Submit payment details"}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function AdvanceButton({ advance }: { advance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  async function pay() {
    const paise = Math.round(Number(amount) * 100);
    if (!paise || paise < 100) return toast.error("Enter at least ₹1.");
    setBusy(true);
    try {
      const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ advance: true, amount: paise, method }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add advance");
      setDone(data.receiptNo);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add advance"); }
    finally { setBusy(false); }
  }
  return (
    <>
      <button onClick={() => { setDone(null); setOpen(true); }} className="rounded-lg bg-brand-50 px-2 py-1 text-[9.5px] font-semibold text-brand-700 hover:bg-brand-100">Add advance</button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { if (done) router.refresh(); setDone(null); } }} title={done ? "Advance added" : "Add to your advance"} description={done ? undefined : `Current advance balance: ${formatINR(advance)}`}>
        {done ? (
          <div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-mint-50 text-mint-600"><Check className="size-6" /></span><p className="mt-4 text-[16px] font-semibold">Advance is ready to use</p><p className="mt-1 text-[11px] text-muted">Receipt {done}</p><Button className="mt-4 w-full" onClick={() => { setOpen(false); router.refresh(); }}>Done</Button></div>
        ) : (
          <div className="space-y-4">
            <Field label="Amount (₹)"><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" /></Field>
            <div className="grid grid-cols-3 gap-2">{methods.map((m) => <button key={m.id} onClick={() => setMethod(m.id)} className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 ${method === m.id ? "border-brand-600 bg-brand-50" : "border-line"}`}><m.icon className="size-4 text-brand-600" /><span className="text-[9.5px] font-semibold">{m.label}</span></button>)}</div>
            <p className="rounded-lg bg-canvas px-3 py-2 text-[9.5px] text-muted">Advance is used against future invoices. Demo gateway — no money moves.</p>
            <Button className="w-full" onClick={pay} disabled={busy}>{busy ? "Processing…" : `Add ${amount ? formatINR(Math.round(Number(amount) * 100)) : "advance"}`}</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
