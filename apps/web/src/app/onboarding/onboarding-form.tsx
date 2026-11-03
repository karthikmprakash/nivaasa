"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { createCommunity, type OnboardingState } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createCommunity, {});
  const [step, setStep] = useState(1);
  const [v, setV] = useState({ name: "", city: "", state: "Karnataka", address: "", pincode: "", towers: "2", unitsPerTower: "24", adminName: "", adminEmail: "", adminPhone: "", password: "" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((prev) => ({ ...prev, [k]: e.target.value }));
  function next() {
    if (step === 1 && (!v.name || !v.city || !v.address)) return;
    if (step === 2 && (!v.towers || !v.unitsPerTower)) return;
    setStep((s) => Math.min(3, s + 1));
  }
  const field = (name: string) => state.fieldErrors?.[name];
  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3].map((s) => <div key={s} className="flex flex-1 items-center gap-1.5"><div className={cn("flex h-1 flex-1 rounded-full", s <= step ? "bg-brand-600" : "bg-line")} /></div>)}
      </div>
      <div className={cn("space-y-4", step !== 1 && "hidden")}>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">Step 1 · Your community</p><h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">Let&apos;s meet your community.</h2><p className="mt-1 text-[11px] text-muted">This is how residents will see it. You can edit everything later.</p></div>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Community name</span><input name="name" value={v.name} onChange={set("name")} required placeholder="e.g. Verdant Heights" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />{field("name") ? <span className="text-[10px] text-[#c43d4d]">{field("name")}</span> : null}</label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">City</span><input name="city" value={v.city} onChange={set("city")} required placeholder="Bengaluru" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">State</span><input name="state" value={v.state} onChange={set("state")} className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label></div>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Address</span><input name="address" value={v.address} onChange={set("address")} required placeholder="Street, area" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink-soft">PIN code</span><input name="pincode" value={v.pincode} onChange={set("pincode")} placeholder="560103" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label>
      </div>

      <div className={cn("space-y-4", step !== 2 && "hidden")}>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">Step 2 · Structure</p><h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">How many homes?</h2><p className="mt-1 text-[11px] text-muted">We&apos;ll create towers and homes automatically. You can add or edit them later.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Towers / blocks</span><input name="towers" type="number" min={1} max={10} value={v.towers} onChange={set("towers")} className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Homes per tower</span><input name="unitsPerTower" type="number" min={4} max={200} value={v.unitsPerTower} onChange={set("unitsPerTower")} className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label></div>
        <div className="rounded-xl border border-line bg-[#fbfcff] p-3"><p className="text-[10px] font-semibold text-ink">Your new community</p><p className="mt-1 text-[10px] text-muted">{v.towers} tower{Number(v.towers) > 1 ? "s" : ""} · {Number(v.towers) * Number(v.unitsPerTower)} homes · default billing heads and amenities included.</p></div>
      </div>

      <div className={cn("space-y-4", step !== 3 && "hidden")}>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">Step 3 · Your account</p><h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">You&apos;re the first admin.</h2><p className="mt-1 text-[11px] text-muted">You can invite committee members and residents once inside.</p></div>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Your name</span><input name="adminName" value={v.adminName} onChange={set("adminName")} required placeholder="Priya Nair" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />{field("adminName") ? <span className="text-[10px] text-[#c43d4d]">{field("adminName")}</span> : null}</label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Email</span><input name="adminEmail" type="email" value={v.adminEmail} onChange={set("adminEmail")} required placeholder="you@community.in" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />{field("adminEmail") ? <span className="text-[10px] text-[#c43d4d]">{field("adminEmail")}</span> : null}</label><label><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Phone</span><input name="adminPhone" type="tel" value={v.adminPhone} onChange={set("adminPhone")} required placeholder="+91…" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /></label></div>
        <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink-soft">Password</span><input name="password" type="password" value={v.password} onChange={set("password")} required minLength={8} placeholder="At least 8 characters" className="h-10 w-full rounded-xl border border-line-strong px-3 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />{field("password") ? <span className="text-[10px] text-[#c43d4d]">{field("password")}</span> : null}</label>
        <div className="rounded-xl bg-mint-50 px-3 py-2 text-[9.5px] leading-relaxed text-mint-600"><Check className="mr-1 inline size-3" /> We&apos;ll set up billing heads, amenities and a welcome notice. No payment details required.</div>
      </div>

      {state.error ? <p className="rounded-lg bg-[#fdeced] px-3 py-2 text-[11px] text-[#c43d4d]">{state.error}</p> : null}
      {state.fieldErrors ? <p className="rounded-lg bg-[#fdeced] px-3 py-2 text-[10.5px] text-[#c43d4d]">{Object.values(state.fieldErrors)[0]}</p> : null}

      <div className="flex items-center justify-between border-t border-line pt-4">
        {step > 1 ? <Button type="button" variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}><ArrowLeft className="size-3.5" /> Back</Button> : <span />}
        {step < 3 ? <Button type="button" size="sm" onClick={next}>Continue <ArrowRight className="size-3.5" /></Button> : <Button type="submit" size="md" disabled={pending}>{pending ? <><Loader2 className="size-4 animate-spin" /> Creating community…</> : <>Create community <ArrowRight className="size-4" /></>}</Button>}
      </div>
    </form>
  );
}
