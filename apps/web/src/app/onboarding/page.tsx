import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your community" };

export default function OnboardingPage() {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-[#0f1c33] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grid-paper opacity-[0.07]" />
        <div className="absolute -left-24 bottom-0 size-[380px] rounded-full bg-blush-400/15 blur-[100px]" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-1.5 text-caption text-white/80 hover:text-white"><ArrowLeft className="size-4" /> Back to Nivaasa</Link>
          <div className="mt-12"><Logo variant="light" size={38} showTagline /></div>
          <p className="mt-10 max-w-md text-[42px] font-semibold leading-[1.02] tracking-[-0.035em]">A new home for your community.</p>
          <p className="mt-4 max-w-sm text-body leading-relaxed text-white/50">Set up your community on Nivaasa in minutes. Open source, self-hosted, and yours to shape.</p>
          <div className="mt-8 space-y-3">
            {[{ i: BuildingIcon, t: "Towers and homes, created for you" }, { i: Users, t: "Roles for committee, managers and guards" }, { i: Wallet, t: "Billing heads and UPI payments ready" }, { i: ShieldCheck, t: "Audit trail and resident privacy by default" }].map((f) => <div key={f.t} className="flex items-center gap-2.5 text-caption text-white/80"><span className="grid size-7 place-items-center rounded-lg bg-white/10"><f.i className="size-3.5 text-blush-300" /></span>{f.t}</div>)}
          </div>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="flex items-center gap-1.5 text-caption font-semibold"><Sparkles className="size-4 text-blush-300" /> Self-managed, not vendor-managed</p><p className="mt-1 text-caption leading-relaxed text-white/80">Your community data lives on infrastructure you control. Export everything, any time.</p></div>
      </aside>
      <main className="relative flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10">
        <div className="absolute inset-0 blush-wash opacity-50" />
        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="mb-6 flex items-center justify-between lg:hidden"><Logo size={32} /><Link href="/" className="text-caption text-muted">Home</Link></div>
          <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_30px_70px_-35px_rgba(19,26,42,0.35)] backdrop-blur sm:p-7">
            <div className="mb-5 flex items-center gap-2"><LogoMark size={28} /><div><p className="text-body font-semibold text-ink">Bring your community onto Nivaasa</p><p className="text-caption text-muted">Free to self-host · set up in under 3 minutes</p></div></div>
            <OnboardingForm />
          </div>
          <p className="mt-4 text-center text-caption text-muted">Already have a community? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></p>
        </div>
      </main>
    </div>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" /></svg>;
}
