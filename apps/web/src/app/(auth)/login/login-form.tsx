"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Email address</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@nivaasa.app" className="h-11 w-full rounded-xl border border-line-strong bg-white pl-10 pr-3 text-sm text-ink placeholder:text-[#a1a9ba] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="block text-[12px] font-semibold text-ink-soft">Password</label>
          <span className="text-[10.5px] font-medium text-muted">Demo: <span className="font-semibold text-ink-soft">demo1234</span></span>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required placeholder="Your password" className="h-11 w-full rounded-xl border border-line-strong bg-white pl-10 pr-11 text-sm text-ink placeholder:text-[#a1a9ba] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {state.error ? <div className="rounded-xl border border-[#f3c9cd] bg-[#fdeced] px-3.5 py-2.5 text-[12px] font-medium text-[#b53a48]">{state.error}</div> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in…</> : <>Sign in <ArrowRight className="size-4" /></>}
      </Button>
      <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-3 shrink-0 text-mint-600" />
        Secure, role-based access. Sessions expire after 7 days. Need help? Contact your community manager.
      </p>
    </form>
  );
}
