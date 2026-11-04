"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Plus, UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/client";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { addResident, type AdminState } from "@/lib/actions/admin";

export function AddResidentDialog({ units }: { units: { id: string; number: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminState, FormData>(addResident, {});
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);
  return (
    <>
      <Button size="sm" onClick={() => { setOpen(true); setCopied(false); }}><UserPlus className="size-4" /> Add resident</Button>
      <Dialog open={open} onOpenChange={setOpen} title={state.ok ? "Resident added" : "Add a resident"} description={state.ok ? undefined : "Create a login for a new owner or tenant and link them to a home."}>
        {state.ok ? (
          <div>
            <div className="rounded-2xl border border-mint-600/20 bg-mint-50 p-4"><p className="flex items-center gap-2 text-body font-semibold text-mint-600"><Check className="size-4" /> {state.message}</p><p className="mt-1.5 text-caption leading-relaxed text-ink-soft">{state.tempPassword ? "Share these temporary credentials securely. The resident can change their password after signing in." : "They can sign in with their existing Nivaasa password. No new credentials were created."}</p></div>
            {state.tempPassword ? <div className="mt-4 rounded-xl border border-line bg-[#fbfcff] p-4"><p className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.12em] text-muted"><KeyRound className="size-4" /> Temporary password</p><p className="mt-1 font-mono text-[18px] font-bold tracking-[0.1em] text-ink">{state.tempPassword}</p><button onClick={async () => { await navigator.clipboard.writeText(state.tempPassword ?? ""); setCopied(true); toast.success("Password copied"); }} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-caption font-semibold text-ink-soft">{copied ? <Check className="size-4 text-mint-600" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy password"}</button></div> : null}
            <Button className="mt-4 w-full" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <Field label="Home"><Select name="unitId" required defaultValue=""><option value="" disabled>Select a vacant home</option>{units.map((u) => <option key={u.id} value={u.id}>{u.number}</option>)}</Select></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Full name"><Input name="name" required placeholder="Aarav Mehta" /></Field><Field label="Residency"><Select name="role"><option value="owner">Owner</option><option value="tenant">Tenant</option><option value="committee">Owner & committee</option></Select></Field></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><Input name="email" type="email" required placeholder="name@example.com" /></Field><Field label="Phone"><Input name="phone" type="tel" required placeholder="+91…" /></Field></div>
            <div className="rounded-xl bg-canvas px-3 py-2 text-caption leading-relaxed text-muted">If this email already has a Nivaasa account, we&apos;ll link it to this society instead of creating a duplicate. New accounts get a temporary password you can share. Only add owners or tenants; family members are managed from the resident app.</div>
            {state.error ? <p className="text-caption text-[#c43d4d]">{state.error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create resident account"}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
