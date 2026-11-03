import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { getSession, isAdminRole } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { demoLoginAction } from "./actions";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your Nivaasa community." };

const demoPeople = [
  { email: "resident@nivaasa.app", name: "Aarav Mehta", role: "Resident", detail: "Verdant Heights · A-402", initials: "AM", color: "bg-brand-100 text-brand-700", icon: Users },
  { email: "admin@nivaasa.app", name: "Priya Nair", role: "Community admin", detail: "Verdant Heights", initials: "PN", color: "bg-blush-100 text-blush-600", icon: Sparkles },
  { email: "guard@nivaasa.app", name: "Ramesh Yadav", role: "Security guard", detail: "Gate 1 · Morning shift", initials: "RY", color: "bg-mint-50 text-mint-600", icon: ShieldCheck },
  { email: "accountant@nivaasa.app", name: "Sanjay Rao", role: "Accountant", detail: "Billing & reports", initials: "SR", color: "bg-[#f7f1e7] text-[#7a5c3e]", icon: Wallet },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; demo?: string }> }) {
  const session = await getSession();
  if (session) {
    const role = session.membership?.role;
    redirect(session.user.globalRole === "super_admin" ? "/portfolio" : role === "guard" ? "/gate" : isAdminRole(role) ? "/admin" : "/app");
  }
  const params = await searchParams;
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[1.04fr_0.96fr]">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#0f1c33] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0 grid-paper opacity-[0.07]" />
        <div className="absolute -right-32 -top-32 size-[420px] rounded-full bg-brand-500/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 size-[380px] rounded-full bg-blush-400/15 blur-[100px]" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 text-[11px] font-medium text-white/50 hover:text-white"><ArrowLeft className="size-3.5" /> Back to Nivaasa</Link>
          <div className="mt-12">
            <Logo variant="light" size={40} showTagline />
            <h1 className="mt-10 max-w-lg text-[46px] font-semibold leading-[1.02] tracking-[-0.05em] xl:text-[52px]">
              Welcome home.
              <br />
              <span className="font-display italic text-blush-300">Everything&apos;s running.</span>
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/55">
              One calm place for the gate, the community, the money and the thousand small things that make a neighbourhood work.
            </p>
          </div>
          <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[9px] font-bold text-emerald-300">● LIVE COMMUNITY</span>
              <span className="text-[9px] text-white/35">Verdant Heights</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { l: "Collected", v: "₹18.6L" },
                { l: "Homes", v: "72" },
                { l: "Open tickets", v: "7" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/[0.05] px-3 py-2.5">
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-white/35">{s.l}</p>
                  <p className="mt-1 text-[17px] font-semibold">{s.v}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-blush-400/20 text-[9px] font-bold text-blush-200">YS</span>
              <div className="flex-1"><p className="text-[10px] font-semibold">Delivery waiting at Gate 1</p><p className="text-[8.5px] text-white/35">Swiggy · A-402 · 2 minutes ago</p></div>
              <span className="rounded-full bg-mint-600 px-2.5 py-1 text-[8px] font-bold">Approve</span>
            </div>
          </div>
        </div>
        <div className="relative mt-10 flex items-center gap-6 text-[10px] text-white/30">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Role-based access</span>
          <span className="inline-flex items-center gap-1.5"><Check className="size-3.5" /> Audit trail</span>
          <span className="inline-flex items-center gap-1.5"><LockIcon /> Your data, your server</span>
        </div>
      </aside>

      {/* Right form */}
      <main className="relative flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10">
        <div className="absolute inset-0 blush-wash opacity-60" />
        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo size={34} />
            <Link href="/" className="text-[11px] font-medium text-muted hover:text-ink">Back home</Link>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">Sign in</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.04em] text-ink">Good to see you again.</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Sign in to your community. Use a demo persona below if you&apos;re exploring.</p>
          </div>
          {params.error ? <div className="mt-5 rounded-xl border border-[#f3c9cd] bg-[#fdeced] px-3.5 py-2.5 text-[12px] font-medium text-[#b53a48]">{params.error}</div> : null}
          <div className="mt-6 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_30px_70px_-35px_rgba(19,26,42,0.35)] backdrop-blur sm:p-6">
            <LoginForm />
          </div>

          {demoEnabled ? (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">One-click demo</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {demoPeople.map((p) => {
                  const Icon = p.icon;
                  return (
                    <form key={p.email} action={demoLoginAction}>
                      <input type="hidden" name="email" value={p.email} />
                      <button type="submit" className="group flex w-full items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-all hover:border-brand-200 hover:shadow-sm">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[9px] font-bold ${p.color}`}>{p.initials}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-ink">{p.role}</span>
                          <span className="block truncate text-[9px] text-muted">{p.detail}</span>
                        </span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                      </button>
                    </form>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[9.5px] text-muted">Password for all demo accounts: <span className="font-semibold text-ink-soft">demo1234</span></p>
                <form action={demoLoginAction}>
                  <input type="hidden" name="email" value="owner@nivaasa.app" />
                  <button type="submit" className="text-[9.5px] font-semibold text-brand-600 hover:text-brand-700">Portfolio owner →</button>
                </form>
              </div>
            </div>
          ) : null}

          <p className="mt-6 text-center text-[10.5px] text-muted">
            New community? <Link href="/onboarding" className="font-semibold text-brand-600 hover:text-brand-700">Bring it onto Nivaasa</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function LockIcon() {
  return <ShieldCheck className="size-3.5" />;
}
