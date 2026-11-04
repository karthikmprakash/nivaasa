"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { inviteTeamMember, updateSocietyPreferences, updateSocietyProfile, type SocietyState } from "@/lib/actions/society";

export function SocietyProfileForm({ society }: { society: Record<string, string | number | null | undefined> }) {
  const [state, action, pending] = useActionState<SocietyState, FormData>(updateSocietyProfile, {});
  useEffect(() => { if (state.ok) toast.success(state.message ?? "Saved"); }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Society name"><Input name="name" defaultValue={society.name as string} required /></Field><Field label="Registration number"><Input name="registrationNo" defaultValue={society.registrationNo as string ?? ""} /></Field></div>
      <Field label="Address"><Textarea name="address" defaultValue={society.address as string} rows={2} required /></Field>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="City"><Input name="city" defaultValue={society.city as string} required /></Field><Field label="State"><Input name="state" defaultValue={society.state as string} /></Field><Field label="PIN code"><Input name="pincode" defaultValue={society.pincode as string} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="GSTIN"><Input name="gstin" defaultValue={society.gstin as string ?? ""} /></Field><Field label="PAN"><Input name="pan" defaultValue={society.pan as string ?? ""} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Bank"><Input name="bankName" defaultValue={society.bankName as string ?? ""} /></Field><Field label="Account number"><Input name="bankAccount" defaultValue={society.bankAccount as string ?? ""} /></Field><Field label="IFSC"><Input name="ifsc" defaultValue={society.ifsc as string ?? ""} /></Field></div>
      {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
      {state.ok ? <p className="text-caption font-medium text-mint-600">{state.message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save society profile"}</Button>
    </form>
  );
}

export function SocietyPreferenceForm({ settings }: { settings: { visitorApproval?: boolean; visitorPassTtlHours?: number; discussionApproval?: boolean; allowResidentClassifieds?: boolean; lateFeePercent?: number; graceDays?: number; helpdeskSlaHours?: number; paymentGateway?: string } }) {
  const [state, action, pending] = useActionState<SocietyState, FormData>(updateSocietyPreferences, {});
  useEffect(() => { if (state.ok) toast.success(state.message ?? "Saved"); }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { n: "visitorApproval", l: "Require resident approval for visitors", v: settings.visitorApproval ?? true },
          { n: "discussionApproval", l: "Moderate discussions before publishing", v: settings.discussionApproval ?? true },
          { n: "allowResidentClassifieds", l: "Allow resident classifieds", v: settings.allowResidentClassifieds ?? true },
        ].map((f) => <label key={f.n} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5"><input type="checkbox" name={f.n} defaultChecked={f.v} className="size-4 accent-[#3155d8]" /><span className="text-caption text-ink-soft">{f.l}</span></label>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><Field label="Visitor pass validity (hours)"><Input name="visitorPassTtlHours" type="number" min={1} max={168} defaultValue={settings.visitorPassTtlHours ?? 24} /></Field><Field label="Late fee (%)"><Input name="lateFeePercent" type="number" min={0} max={25} step="0.5" defaultValue={settings.lateFeePercent ?? 2} /></Field><Field label="Grace days"><Input name="graceDays" type="number" min={0} max={30} defaultValue={settings.graceDays ?? 5} /></Field></div>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Helpdesk default SLA (hours)"><Input name="helpdeskSlaHours" type="number" min={1} max={168} defaultValue={settings.helpdeskSlaHours ?? 24} /></Field><Field label="Payment gateway"><Select name="paymentGateway" defaultValue={settings.paymentGateway ?? "demo"}><option value="demo">Demo gateway (no money moves)</option><option value="razorpay">Razorpay</option><option value="stripe">Stripe</option></Select></Field></div>
      {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
      {state.ok ? <p className="text-caption font-medium text-mint-600">{state.message}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</Button>
    </form>
  );
}

export function InviteTeamDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<SocietyState, FormData>(inviteTeamMember, {});
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);
  return (
    <>
      <Button size="sm" onClick={() => { setOpen(true); setCopied(false); }}><UserPlus className="size-4" /> Add team member</Button>
      <Dialog open={open} onOpenChange={setOpen} title={state.ok ? "Team member added" : "Add a team member"} description={state.ok ? undefined : "Give a committee member or staff lead access to the admin console."}>
        {state.ok ? (
          <div><div className="rounded-2xl border border-mint-600/20 bg-mint-50 p-4"><p className="flex items-center gap-2 text-body font-semibold text-mint-600"><Check className="size-4" /> {state.message}</p>{state.tempPassword ? null : <p className="mt-1.5 text-caption leading-relaxed text-ink-soft">They can sign in with their existing Nivaasa password. No new credentials were created.</p>}</div>{state.tempPassword ? <div className="mt-4 rounded-xl border border-line bg-[#fbfcff] p-4"><p className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.12em] text-muted"><KeyRound className="size-4" /> Temporary password</p><p className="mt-1 font-mono text-[18px] font-bold tracking-[0.1em] text-ink">{state.tempPassword}</p><button onClick={async () => { await navigator.clipboard.writeText(state.tempPassword ?? ""); setCopied(true); toast.success("Copied"); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-caption font-semibold text-ink-soft">{copied ? <Check className="size-4 text-mint-600" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}</button></div> : null}<Button className="mt-4 w-full" onClick={() => setOpen(false)}>Done</Button></div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input name="name" required placeholder="Sanjay Rao" /></Field><Field label="Role"><Select name="role"><option value="committee">Committee member</option><option value="manager">Community manager</option><option value="accountant">Accountant</option><option value="helpdesk_manager">Helpdesk manager</option><option value="security_manager">Security manager</option><option value="auditor">Auditor</option><option value="admin">Society admin</option></Select></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><Input name="email" type="email" required /></Field><Field label="Phone"><Input name="phone" type="tel" required /></Field></div>
            {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Adding…" : "Add to team"}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
