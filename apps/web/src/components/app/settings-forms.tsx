"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { changePassword, updateProfile, type SettingsState } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/ui/client";
import { Field, Input } from "@/components/ui/primitives";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateProfile, {});
  useEffect(() => { if (state.ok) toast.success(state.message ?? "Saved"); }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Full name"><Input name="name" defaultValue={name} required /></Field><Field label="Phone"><Input name="phone" defaultValue={phone} required /></Field></div>
      <Field label="Email"><Input value={email} disabled /></Field>
      {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
      <SubmitButton size="sm">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, {});
  useEffect(() => { if (state.ok) toast.success(state.message ?? "Password changed"); }, [state]);
  return (
    <form action={action} className="space-y-3">
      <Field label="Current password"><Input name="current" type="password" required placeholder="••••••••" /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="New password"><Input name="next" type="password" required placeholder="At least 8 characters" /></Field><Field label="Confirm new password"><Input name="confirm" type="password" required /></Field></div>
      {state.error ? <p className="text-[11px] text-[#c43d4d]">{state.error}</p> : null}
      {state.ok ? <p className="text-[11px] font-medium text-mint-600">{state.message}</p> : null}
      <SubmitButton size="sm" variant="outline">Update password</SubmitButton>
    </form>
  );
}
