"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck, UserRound, Wallet, ClipboardList, Check, Users, Bell, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "resident",
    label: "Resident",
    icon: UserRound,
    title: "Everything at home, in one calm place.",
    body: "Approve a delivery without leaving a meeting, pay maintenance before the due date, book the tennis court and keep up with your community — all from one beautifully simple app.",
    points: ["One-tap visitor approvals and pre-approved passes", "UPI payments, receipts and advance balance", "Helpdesk with real updates, not black holes", "Amenities, polls, notices and neighbourhood marketplace"],
    accent: "brand",
  },
  {
    id: "admin",
    label: "Committee & admin",
    icon: ClipboardList,
    title: "Run the society without running after people.",
    body: "A single operating picture for collections, complaints, security and compliance. Automate the repetitive work and give every committee member the same version of the truth.",
    points: ["Billing runs, defaulter follow-ups and audit-ready books", "SLA-driven helpdesk with team performance", "Live gate activity, patrol checks and panic alerts", "Role-based access for managers, treasurers and auditors"],
    accent: "pink",
  },
  {
    id: "guard",
    label: "Security & gate",
    icon: ShieldCheck,
    title: "A calmer gate, a safer community.",
    body: "Guards get a fast, language-friendly console with photo capture, passcode verification, delivery logging, domestic help attendance and patrol checkpoints. No paper registers.",
    points: ["Search any flat or resident in seconds", "Verify 6-digit passcodes and pre-approvals", "Log deliveries with leave-at-gate workflow", "Patrol rounds, panic response and shift handover"],
    accent: "ink",
  },
];

export function RoleTabs() {
  const [active, setActive] = useState("resident");
  const role = roles.find((r) => r.id === active)!;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => {
          const Icon = r.icon;
          const selected = active === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setActive(r.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all",
                selected ? "border-brand-600 bg-brand-600 text-white shadow-[0_8px_24px_-12px_rgba(49,85,216,0.6)]" : "border-line bg-white text-ink-soft hover:border-brand-200 hover:text-ink",
              )}
              aria-pressed={selected}
            >
              <Icon className="size-4" /> {r.label}
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col justify-between rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-8">
          <div>
            <div className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", role.accent === "pink" ? "bg-blush-100 text-blush-600" : role.accent === "ink" ? "bg-[#eef1f8] text-ink-soft" : "bg-brand-50 text-brand-700")}>
              Built for {role.label.toLowerCase()}
            </div>
            <h3 className="max-w-md text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[32px]">{role.title}</h3>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-soft">{role.body}</p>
            <ul className="mt-6 space-y-3">
              {role.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-ink-soft">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-600"><Check className="size-2.5" strokeWidth={3} /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <a href="/login?demo=1" className="mt-7 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700">
            Explore the {role.id === "admin" ? "admin console" : role.id === "guard" ? "guard console" : "resident app"} <ArrowRight className="size-3.5" />
          </a>
        </div>
        <div className={cn("relative min-w-0 rounded-[26px] border p-2 min-[360px]:p-4 sm:p-6", role.accent === "pink" ? "border-blush-200 bg-blush-50" : role.accent === "ink" ? "border-[#d9dfec] bg-[#eef1f8]" : "border-brand-100 bg-brand-50/70")}>
          <div className="absolute inset-0 dot-paper opacity-40" />
          <div className="relative h-full">
            {active === "resident" ? <ResidentPreview /> : active === "admin" ? <AdminPreview /> : <GuardPreview />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResidentPreview() {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[30px] border border-line bg-white p-3 shadow-[0_30px_60px_-30px_rgba(19,26,42,0.25)]">
      <div className="rounded-[22px] bg-[#fbfcff] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-muted">Good morning</p>
            <p className="text-[15px] font-bold text-ink">Aarav Mehta</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative grid size-7 place-items-center rounded-full bg-white shadow-sm"><Bell className="size-3.5 text-ink-soft" /><span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-blush-400 ring-2 ring-white" /></div>
            <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-[9px] font-bold text-white">AM</span>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-glow">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/70">Total due</p>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-semibold">Due 15 Nov</span>
          </div>
          <p className="mt-1 text-[26px] font-bold tracking-[-0.03em]">₹5,935</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-brand-700">Pay now</span>
            <span className="text-[9px] text-white/70">2 invoices · 1 overdue</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
          {[
            { label: "Pre-approve", icon: UserRound },
            { label: "Helpdesk", icon: ClipboardList },
            { label: "Amenities", icon: CalendarDays },
            { label: "Payments", icon: Wallet },
          ].map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white px-1 py-2">
              <a.icon className="size-4 text-brand-600" />
              <span className="text-[7.5px] font-semibold text-ink-soft">{a.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl border border-blush-200 bg-blush-50 p-3">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-bold text-blush-600">AT THE GATE</span>
            <span className="text-[8px] text-muted">Just now</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-snug text-ink">Yash from Swiggy is waiting with your order</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-white px-2.5 py-1 text-[8.5px] font-semibold text-ink-soft">Deny</span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-[8.5px] font-semibold text-ink-soft">Leave at gate</span>
            <span className="rounded-lg bg-mint-600 px-2.5 py-1 text-[8.5px] font-semibold text-white">Approve</span>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-line bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[#f2effc] text-[8px] font-bold text-[#6a54c8]">NK</span>
            <div>
              <p className="text-[9px] font-semibold text-ink">Neha Kulkarni</p>
              <p className="text-[7.5px] text-muted">Committee · 12m ago</p>
            </div>
          </div>
          <p className="mt-1.5 text-[9px] leading-snug text-ink-soft">Diwali Mela this Saturday on the central lawn. RSVP for dinner! ✨</p>
        </div>
      </div>
    </div>
  );
}

function AdminPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_60px_-35px_rgba(19,26,42,0.25)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-[9px] font-semibold text-muted">Verdant Heights</p>
          <p className="text-[13px] font-bold text-ink">Good morning, Priya</p>
        </div>
        <span className="rounded-full bg-mint-50 px-2 py-1 text-[8px] font-bold text-mint-600">All systems normal</span>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Collected", v: "₹18.6L", h: "+8.4%", tone: "bg-brand-50" },
            { l: "Outstanding", v: "₹2.4L", h: "42 units", tone: "bg-blush-50" },
            { l: "Open tickets", v: "7", h: "2 near SLA", tone: "bg-[#f7f8fc]" },
          ].map((s) => (
            <div key={s.l} className={cn("rounded-xl p-2.5", s.tone)}>
              <p className="text-[7.5px] font-semibold uppercase tracking-wide text-muted">{s.l}</p>
              <p className="mt-0.5 text-[15px] font-bold tracking-tight text-ink">{s.v}</p>
              <p className="text-[7.5px] text-ink-soft">{s.h}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-xl border border-line p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-semibold text-ink">Collections vs expenses</p>
            <p className="text-[7.5px] text-muted">Last 6 months</p>
          </div>
          <div className="mt-2 flex h-24 items-end gap-2">
            {[62, 74, 68, 88, 79, 94].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 78 }}>
                  <div className="w-1/2 rounded-t-sm bg-brand-500" style={{ height: `${h}%` }} />
                  <div className="w-1/2 rounded-t-sm bg-blush-300" style={{ height: `${h * 0.62}%` }} />
                </div>
                <span className="text-[6.5px] text-muted">{["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2.5 space-y-1.5">
          {[
            { t: "Offline payment to verify", s: "Aarav Mehta · NEFT", c: "bg-amber-soft text-amber-ink", b: "Verify" },
            { t: "New discussion needs approval", s: "Riya Sen · Community", c: "bg-brand-50 text-brand-700", b: "Review" },
          ].map((r) => (
            <div key={r.t} className="flex items-center justify-between rounded-xl border border-line px-2.5 py-2">
              <div>
                <p className="text-[9px] font-semibold text-ink">{r.t}</p>
                <p className="text-[7.5px] text-muted">{r.s}</p>
              </div>
              <span className={cn("rounded-full px-2 py-1 text-[7.5px] font-bold", r.c)}>{r.b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GuardPreview() {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[26px] border border-[#d6deeb] bg-white p-3 shadow-[0_30px_60px_-30px_rgba(19,26,42,0.25)]">
      <div className="rounded-[18px] bg-[#0f1c33] p-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-medium text-white/50">Gate 1 · Morning shift</p>
            <p className="text-[13px] font-bold">Namaste, Ramesh</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-semibold">● On duty</span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
          <span className="text-[10px] text-white/50">⌕</span>
          <span className="text-[10px] text-white/60">Search flat, resident or passcode…</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { t: "New visitor", s: "Log entry", c: "bg-brand-50 text-brand-700" },
          { t: "Delivery", s: "3 at gate", c: "bg-blush-50 text-blush-600" },
          { t: "Daily help", s: "Attendance", c: "bg-[#eef7f1] text-mint-600" },
          { t: "Patrol check", s: "5 of 6", c: "bg-[#f7f5ee] text-amber-ink" },
        ].map((a) => (
          <div key={a.t} className={cn("rounded-xl p-3", a.c)}>
            <p className="text-[10px] font-bold">{a.t}</p>
            <p className="mt-0.5 text-[8px] opacity-70">{a.s}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-line p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-ink">Waiting for approval</p>
          <span className="rounded-full bg-blush-100 px-2 py-0.5 text-[8px] font-bold text-blush-600">3</span>
        </div>
        <div className="mt-2 space-y-2">
          {[
            { n: "Yash · Swiggy", f: "A-402", t: "2m", c: "#fde8ef" },
            { n: "Vikram Sethi", f: "B-203", t: "8m", c: "#e6ecff" },
            { n: "Suresh · Uber", f: "C-101", t: "11m", c: "#f3ede4" },
          ].map((v) => (
            <div key={v.n} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full text-[7px] font-bold text-ink-soft" style={{ background: v.c }}>{v.n.slice(0, 2)}</span>
                <div>
                  <p className="text-[9px] font-semibold text-ink">{v.n}</p>
                  <p className="text-[7.5px] text-muted">{v.f}</p>
                </div>
              </div>
              <span className="text-[7.5px] text-muted">{v.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#fdf3f5] px-3 py-2 text-[8px] font-semibold text-[#c43d4d]">
        <span>Emergency panic alert</span><span>Hold to raise</span>
      </div>
    </div>
  );
}
