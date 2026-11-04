"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock3, IndianRupee, Loader2, Plus, ReceiptText, Wallet } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { applyLateFees, createBillingHead, createExpense, runBilling, type BillingState, type ExpenseState } from "@/lib/actions/billing";
import { formatINR, todayISO } from "@/lib/utils";

type Head = { id: string; name: string; basis: string; defaultAmount: number };

export function RunBillingDialog({ heads }: { heads: Head[] }) {
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<BillingState, FormData>(runBilling, {});
  useEffect(() => { if (state.ok) { setShowSuccess(true); router.refresh(); } }, [state.ok, router]);
  const [todayYear, todayMonth] = todayISO().split("-").map(Number);
  const nextMonthStart = new Date(Date.UTC(todayYear, todayMonth, 1)).toISOString().slice(0, 10);
  const nextMonthEnd = new Date(Date.UTC(todayYear, todayMonth + 1, 0)).toISOString().slice(0, 10);
  return (
    <>
      <Button size="sm" onClick={() => { setShowSuccess(false); setOpen(true); }}><ReceiptText className="size-4" /> Run billing</Button>
      <Dialog open={open} onOpenChange={setOpen} title={showSuccess ? "Billing run complete" : "Run monthly billing"} description={showSuccess ? undefined : "Generate invoices for occupied homes in one controlled run. Existing invoices for the period are skipped."} className="max-w-2xl">
        {showSuccess ? (
          <div className="py-2 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-7" /></span><p className="mt-4 text-[19px] font-semibold text-ink">{state.count} invoices created</p><p className="mt-1 text-caption text-muted">{state.message}</p><div className="mt-4 rounded-xl bg-canvas px-4 py-3 text-caption text-ink-soft">Residents have been notified. They can view and pay from their app immediately.</div><Button className="mt-4 w-full" onClick={() => setOpen(false)}>Done</Button></div>
        ) : (
          <form action={action} className="space-y-4">
            <Field label="Invoice title"><Input name="title" defaultValue="Monthly Maintenance" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Period start"><Input type="date" name="periodStart" defaultValue={nextMonthStart} required /></Field><Field label="Period end"><Input type="date" name="periodEnd" defaultValue={nextMonthEnd} required /></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Issue date"><Input type="date" name="issueDate" defaultValue={todayISO()} required /></Field><Field label="Due date"><Input type="date" name="dueDate" defaultValue={todayISO(14)} required /></Field></div>
            <div>
              <p className="mb-1.5 text-body font-semibold text-ink-soft">Billing heads</p>
              <div className="grid gap-1.5 sm:grid-cols-2">{heads.map((h) => <label key={h.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5"><Checkbox name="headIds" value={h.id} defaultChecked /><span className="flex-1"><span className="block text-caption font-semibold text-ink">{h.name}</span><span className="text-caption text-muted">{h.basis === "per_sqft" ? `₹${(h.defaultAmount / 100).toFixed(2)} / sq ft` : h.basis === "per_unit" ? `${formatINR(h.defaultAmount)} / parking slot` : h.basis === "meter" ? `${formatINR(h.defaultAmount)} per reading` : `${formatINR(h.defaultAmount)} per home`}</span></span></label>)}</div>
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-line bg-[#fbfcff] px-3 py-2.5"><Checkbox name="includeVacant" className="mt-0.5" /><span><span className="block text-caption font-semibold text-ink">Also invoice vacant homes</span><span className="text-caption text-muted">Useful when an unsold or vacant unit still has an owner responsible for maintenance.</span></span></label>
            <div className="rounded-xl border border-line bg-[#fbfcff] p-3 text-caption leading-relaxed text-muted">By default this creates one invoice per occupied home for the selected period. It does not charge any card. Residents receive an in-app notification and can pay via UPI or record an offline payment.</div>
            {state.error ? <p className="rounded-lg bg-[#fdeced] px-3 py-2 text-caption text-[#c43d4d]">{state.error}</p> : null}
            <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? <><Loader2 className="size-4 animate-spin" /> Generating invoices…</> : "Create invoices"}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function LateFeeDialog({ eligible, graceDays, lateFeePercent }: { eligible: number; graceDays: number; lateFeePercent: number }) {
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<BillingState, FormData>(applyLateFees, {});
  useEffect(() => { if (state.ok) { setShowSuccess(true); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setShowSuccess(false); setOpen(true); }}><Clock3 className="size-4" /> Late fees</Button>
      <Dialog open={open} onOpenChange={setOpen} title={showSuccess ? "Late fees applied" : "Apply late fees"} description={showSuccess ? undefined : `Society policy: ${lateFeePercent}% after ${graceDays} grace days.`}>
        {showSuccess ? (
          <div className="py-2 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-mint-50 text-mint-600"><CheckCircle2 className="size-6" /></span><p className="mt-4 text-[17px] font-semibold text-ink">{state.count} invoices updated</p><p className="mt-1 text-caption text-muted">{state.message} Residents have been notified.</p><Button className="mt-4 w-full" onClick={() => setOpen(false)}>Done</Button></div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="rounded-xl border border-line bg-[#fbfcff] p-4 text-caption leading-relaxed text-muted">
              <p><span className="font-semibold text-ink">{eligible}</span> unpaid invoices are past the grace period and have no late fee yet.</p>
              <p className="mt-1">The fee is calculated on the outstanding balance and added to the invoice total. Each invoice is only charged once.</p>
            </div>
            {state.error ? <p className="rounded-lg bg-[#fdeced] px-3 py-2 text-caption text-[#c43d4d]">{state.error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending || !eligible}>{pending ? <><Loader2 className="size-4 animate-spin" /> Applying…</> : `Apply late fees to ${eligible} invoices`}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}

export function ExpenseDialog({ vendors }: { vendors: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<ExpenseState, FormData>(createExpense, {});
  useEffect(() => { if (state.ok) { toast.success("Expense recorded"); setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><IndianRupee className="size-4" /> Record expense</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Record an expense" description="Keep the committee and auditor on the same page.">
        <form action={action} className="space-y-4">
          <Field label="Description"><Input name="description" required placeholder="e.g. Lift AMC — November" /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Category"><Select name="category"><option>Housekeeping</option><option>Security</option><option>Lift AMC</option><option>Landscaping</option><option>Water</option><option>Electricity</option><option>Repairs</option><option>Events</option><option>Administrative</option><option>Other</option></Select></Field><Field label="Vendor"><Select name="vendorId" defaultValue=""><option value="">No vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Amount (₹)"><Input name="amount" type="number" min={1} required placeholder="42000" /></Field><Field label="Date"><Input name="date" type="date" defaultValue={todayISO()} required /></Field></div>
          <Field label="Status"><Select name="status"><option value="paid">Paid</option><option value="approved">Approved, pending payment</option><option value="pending">Pending approval</option></Select></Field>
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Record expense"}</Button>
        </form>
      </Dialog>
    </>
  );
}

export function AddHeadDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<BillingState, FormData>(createBillingHead, {});
  useEffect(() => { if (state.ok) { toast.success("Billing head added"); setOpen(false); router.refresh(); } }, [state.ok, router]);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" /> Add head</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Add a billing head" description="Charge for water, parking, sinking fund or anything specific to your community.">
        <form action={action} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="Diesel generator" /></Field><Field label="Code"><Input name="code" placeholder="DG" maxLength={6} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Basis"><Select name="basis"><option value="fixed">Fixed amount</option><option value="per_sqft">Per sq ft</option><option value="per_unit">Per parking slot</option></Select></Field><Field label="Default amount (₹)"><Input name="amount" type="number" min={0} step="0.01" required placeholder="500" /></Field></div>
          <Field label="GST rate (%)"><Input name="gstRate" type="number" min={0} max={28} defaultValue={0} /></Field>
          {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add billing head"}</Button>
        </form>
      </Dialog>
    </>
  );
}
