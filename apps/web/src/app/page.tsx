import Link from "next/link";
import {
  ArrowRight, ShieldCheck, Sparkles, Building2, Wallet, Wrench, CalendarHeart, MessageCircle,
  Check, LockKeyhole, Smartphone, Code2, Server, Globe2, Users, KeyRound, FileCheck2,
  ArrowUpRight, PlayCircle, CheckCircle2, CircleDot, ReceiptIndianRupee, Landmark,
  Fingerprint, BellRing, ChartNoAxesCombined, BedDouble, Dumbbell, Trophy, Waves, Flower2,
} from "lucide-react";
import { CommunityDay } from "@/components/marketing/community-day";
import { MarketingNav } from "@/components/marketing/nav";
import { RoleTabs } from "@/components/marketing/role-tabs";
import { Reveal } from "@/components/marketing/reveal";
import { Logo, LogoMark } from "@/components/brand/logo";
import { MarkReveal } from "@/components/brand/mark-reveal";
import { getSession } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getSession();
  const signedIn = !!session;
  const home = session
    ? session.user.globalRole === "super_admin"
      ? "/portfolio"
      : session.membership?.role === "guard"
        ? "/gate"
        : isAdminRole(session.membership?.role)
          ? "/admin"
          : "/app"
    : "/login";

  return (
    <div className="overflow-x-clip">
      <MarketingNav signedIn={signedIn} home={home} />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="hero-wash relative pt-[calc(6rem+env(safe-area-inset-top))] pb-12 sm:pt-[calc(9rem+env(safe-area-inset-top))] sm:pb-16 lg:pb-24">
          <div className="relative mx-auto max-w-[1180px] landing-gutter">
            <div className="grid grid-cols-1 items-center gap-8 sm:gap-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <div className="animate-in-up">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
                  <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-blush-400 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-blush-400" /></span>
                  Open source · Self-hosted · Built for community living
                </div>
                <h1 className="mt-6 max-w-[620px] text-[clamp(2rem,9.5vw,2.875rem)] font-semibold leading-[1.03] tracking-[-0.035em] text-ink sm:text-[62px] lg:text-[68px]">
                  Your community,
                  <br />
                  running beautifully.
                </h1>
                <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
                  Security at the gate, calm at home, clarity in the accounts. Nivaasa brings every part of your gated community into one gentle, powerful platform — owned by the community itself.
                </p>
                <div className="mt-7 flex flex-col items-stretch gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center">
                  <Link href="/login?demo=1" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-[0_16px_36px_-14px_rgba(49,85,216,0.7)] transition-all hover:-translate-y-0.5 hover:bg-brand-700">
                    Explore the live demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a href="#platform" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line-strong bg-white/80 px-5 text-sm font-semibold text-ink shadow-sm backdrop-blur transition-colors hover:bg-white">
                    <PlayCircle className="size-4 text-brand-600" /> See the platform
                  </a>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-mint-600" /> Free to self-host</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-mint-600" /> No per-resident fees</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-mint-600" /> Your data, your server</span>
                </div>
              </div>
              <div className="relative animate-fade [animation-delay:120ms]">
                <HeroMock />
                <p className="mt-4 text-center text-xs text-muted">Illustrative preview of the Verdant Heights demo community</p>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
              {[
                { value: "3", label: "connected experiences" },
                { value: "Web + mobile", label: "resident access" },
                { value: "100%", label: "data ownership" },
                { value: "0", label: "per-resident licence fees" },
              ].map((s) => (
                <div key={s.label} className="bg-white/80 px-5 py-4 backdrop-blur">
                  <p className="text-[22px] font-semibold tracking-[-0.04em] text-ink">{s.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Promise strip ────────────────────────────────────────────── */}
        <section className="border-y border-line bg-white py-5">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-8 gap-y-3 landing-gutter">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">One system for the whole community</p>
            {["Gate & security", "Community life", "Payments & ERP", "Helpdesk & SLAs", "Amenities", "Staff & vendors"].map((t) => (
              <span key={t} className="text-sm font-semibold text-ink-soft">{t}</span>
            ))}
          </div>
        </section>

        {/* ── Platform bento ──────────────────────────────────────────── */}
        <section id="platform" className="relative mx-auto max-w-[1180px] scroll-mt-24 landing-gutter py-20 sm:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">The platform</p>
              <h2 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[46px]">
                The whole community, <span className="font-display italic text-blush-500">one quiet system.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                Not five apps and a WhatsApp group. Nivaasa connects the gate to the accounts, the helpdesk to the vendor, and the committee to every resident — with one shared source of truth.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Reveal className="sm:col-span-2 lg:col-span-4" delay={0}>
              <div className="group relative h-full overflow-hidden rounded-[26px] border border-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><ShieldCheck className="size-5" /></div>
                    <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">The gate, without the guesswork</h3>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">Pre-approvals, guest passes, delivery logging, domestic help attendance and patrol rounds — every entry has a name, a time and a witness.</p>
                  </div>
                  <span className="rounded-full bg-mint-50 px-2.5 py-1 text-xs font-bold text-mint-600">Live</span>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-3 min-[860px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="rounded-2xl border border-line bg-[#fbfcff] p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blush-600">At the gate</span>
                      <span className="text-xs text-muted">2 min ago</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="grid size-10 place-items-center rounded-full bg-blush-100 text-xs font-bold text-blush-600">YS</span>
                      <div>
                        <p className="text-sm font-semibold text-ink">Yash Sharma</p>
                        <p className="text-xs text-muted">Swiggy · Delivery · A-402</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <span className="flex-1 rounded-lg border border-line bg-white py-1.5 text-center text-xs font-semibold text-ink-soft">Deny</span>
                      <span className="flex-1 rounded-lg border border-line bg-white py-1.5 text-center text-xs font-semibold text-ink-soft">Leave at gate</span>
                      <span className="flex-1 rounded-lg bg-brand-600 py-1.5 text-center text-xs font-semibold text-white">Approve</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { l: "Pre-approved passes", v: "12", i: KeyRound },
                      { l: "Entries today", v: "184", i: Fingerprint },
                      { l: "Patrol checks", v: "5 / 6", i: ShieldCheck },
                    ].map((s) => (
                      <div key={s.l} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
                        <div className="flex items-center gap-2"><s.i className="size-3.5 text-brand-500" /><span className="text-xs font-medium text-ink-soft">{s.l}</span></div>
                        <span className="text-sm font-bold text-ink">{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-2" delay={0.06}>
              <div className="h-full rounded-[26px] border border-blush-200 bg-blush-50 p-6 shadow-soft transition-shadow hover:shadow-lift">
                <div className="grid size-10 place-items-center rounded-xl bg-white text-blush-500"><Users className="size-5" /></div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">A neighbourhood, not a noticeboard</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">Polls, discussions, events and a trusted marketplace — a private social layer with the committee in control.</p>
                <div className="mt-5 rounded-2xl border border-blush-200 bg-white p-3.5">
                  <p className="text-xs font-semibold leading-snug text-ink">Should we add a second EV charger in B2 parking?</p>
                  <div className="mt-2.5 space-y-1.5">
                    {[{ l: "Yes, install one", w: "72%" }, { l: "Shared arrangement", w: "18%" }, { l: "Not needed", w: "10%" }].map((o) => (
                      <div key={o.l}>
                        <div className="flex justify-between text-xs font-medium text-ink-soft"><span>{o.l}</span><span>{o.w}</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-blush-50"><div className="h-full rounded-full bg-blush-300" style={{ width: o.w }} /></div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-xs text-muted">24 votes · 5 days left · Owners only</p>
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-2" delay={0.1}>
              <div className="h-full rounded-[26px] border border-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Wallet className="size-5" /></div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Money, minus the mystery</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">Invoices, UPI payments, advances, offline intimations and receipts that reconcile themselves.</p>
                <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-glow">
                  <p className="text-xs font-medium text-white/80">Total due · November 2026</p>
                  <p className="mt-1 text-[26px] font-semibold tracking-[-0.04em]">₹5,935</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-white/80">Due 15 Nov</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-brand-700">Pay with UPI</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                  <ReceiptIndianRupee className="size-4 text-mint-600" />
                  <span className="text-xs font-medium text-ink-soft">Receipt ready instantly</span>
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-2" delay={0.14}>
              <div className="h-full rounded-[26px] border border-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift">
                <div className="grid size-10 place-items-center rounded-xl bg-[#f2effc] text-[#6a54c8]"><Wrench className="size-5" /></div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Helpdesk that closes the loop</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">Every complaint assigned, timed and escalated. Residents see progress; the committee sees patterns.</p>
                <div className="mt-5 space-y-3 border-l-2 border-line pl-4">
                  {[
                    { t: "Complaint raised", d: "Today, 8:30 AM", done: true },
                    { t: "Assigned to Ravi · Plumber", d: "8:52 AM · SLA 6h", done: true },
                    { t: "On the way", d: "10:10 AM", done: false },
                  ].map((s) => (
                    <div key={s.t} className="relative">
                      <span className={`absolute -left-[21px] top-0.5 size-2.5 rounded-full ring-2 ring-white ${s.done ? "bg-mint-600" : "bg-blush-300"}`} />
                      <p className="text-xs font-semibold text-ink">{s.t}</p>
                      <p className="text-xs text-muted">{s.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-2" delay={0.18}>
              <div className="h-full rounded-[26px] border border-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift">
                <div className="grid size-10 place-items-center rounded-xl bg-mint-50 text-mint-600"><CalendarHeart className="size-5" /></div>
                <h3 className="mt-4 text-[19px] font-semibold tracking-[-0.02em] text-ink">Amenities without the register</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">Live availability, fair slot rules and payments built in. No double bookings, no committee calls.</p>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[Waves, Dumbbell, Trophy, BedDouble].map((Icon, i) => (
                    <div key={i} className="grid aspect-square place-items-center rounded-xl bg-canvas text-brand-500"><Icon className="size-5" /></div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["6:00", "7:00", "8:00", "9:00"].map((t, i) => (
                    <span key={t} className={`rounded-lg px-2 py-1 text-xs font-semibold ${i === 1 ? "bg-brand-600 text-white" : i === 2 ? "bg-blush-100 text-blush-600" : "bg-canvas text-muted"}`}>{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-3" delay={0.22}>
              <div className="h-full rounded-[26px] border border-line bg-[#fbfcff] p-6 shadow-soft sm:p-7">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><Landmark className="size-5" /></div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-muted shadow-sm">Audit-ready</span>
                </div>
                <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">Accounting an auditor would enjoy</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">Billing heads, per-sq-ft runs, GST, penalties, expenses, vendors, budgets and reports. Every action leaves a trail.</p>
                <div className="mt-5 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3">
                  {[{ l: "Collections", v: "₹18.6L", c: "text-mint-600" }, { l: "Expenses", v: "₹9.8L", c: "text-blush-600" }, { l: "Balance", v: "₹8.8L", c: "text-brand-700" }].map((s) => (
                    <div key={s.l} className="rounded-xl border border-line bg-white px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.l}</p>
                      <p className={`mt-1 text-[15px] font-bold ${s.c}`}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-3" delay={0.26}>
              <div className="h-full rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-7">
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-blush-50 text-blush-500"><MessageCircle className="size-5" /></div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">Moderated</span>
                </div>
                <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-ink">A home for the conversations that matter</h3>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">Official notices, resident discussions, classifieds, documents and events — searchable, moderated and retained.</p>
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-blush-100 text-xs font-bold text-blush-600">RS</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">Looking for a reliable cook for weekday dinners</p>
                    <p className="text-xs text-muted">Riya Sen · C-101 · awaiting moderation</p>
                  </div>
                  <span className="rounded-full bg-amber-soft px-2 py-1 text-xs font-bold text-amber-ink">Review</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Roles ───────────────────────────────────────────────────── */}
        <section id="resident" className="relative scroll-mt-24 border-y border-line bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-[1180px] landing-gutter">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">One source of truth</p>
                  <h2 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[46px]">Three experiences.<br /><span className="font-display italic text-brand-600">One community.</span></h2>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-ink-soft">Residents, committees and guards each get a purpose-built interface — connected to the same real-time data.</p>
              </div>
            </Reveal>
            <Reveal className="mt-9" delay={0.05}><RoleTabs /></Reveal>
          </div>
        </section>

        <CommunityDay />

        {/* ── Security ────────────────────────────────────────────────── */}
        <section id="security" className="scroll-mt-24 landing-gutter [--landing-gutter:0.75rem] pb-20 sm:[--landing-gutter:1.25rem] sm:pb-28">
          <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-[#0f1c33] text-white shadow-[0_40px_100px_-40px_rgba(15,28,51,0.8)]">
            <div className="relative grid grid-cols-1 gap-8 p-4 sm:gap-10 sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:p-16">
              <div className="absolute inset-0 grid-paper opacity-[0.06]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70">
                  <span className="size-1.5 rounded-full bg-blush-400" /> Security & governance
                </div>
                <h2 className="mt-6 max-w-lg text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[46px]">Built to be trusted,<br /><span className="font-display italic text-blush-300">not just used.</span></h2>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-white/80">Every approval, payment and edit is logged. Access is scoped by role. Sensitive resident data can be masked, and the whole platform runs on infrastructure you control.</p>
                <div className="mt-8 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  {[
                    { icon: KeyRound, t: "Granular roles", d: "Admin, treasurer, auditor, guard & custom scopes" },
                    { icon: FileCheck2, t: "Full audit trail", d: "Who did what, when, and from where" },
                    { icon: LockKeyhole, t: "Private by default", d: "Masked directory and purpose-limited data" },
                    { icon: Server, t: "Self-hosted", d: "SQLite on your own server" },
                  ].map((f) => (
                    <div key={f.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <f.icon className="size-4 text-blush-300" />
                      <p className="mt-2.5 text-sm font-semibold">{f.t}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/70">{f.d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Live gate activity</p>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> Demo activity</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { n: "Sunita Devi", t: "Daily help · A-402", s: "Entered", c: "bg-emerald-400/15 text-emerald-300", time: "8:12 AM" },
                      { n: "Anil Kumar", t: "Vendor · CoolCare", s: "Approved", c: "bg-sky-400/15 text-sky-300", time: "9:02 AM" },
                      { n: "Yash Sharma", t: "Delivery · Swiggy", s: "At gate", c: "bg-blush-400/15 text-blush-300", time: "9:38 AM" },
                      { n: "Suresh Babu", t: "Cab · Uber · C-101", s: "Pending", c: "bg-amber-400/15 text-amber-200", time: "9:45 AM" },
                    ].map((v) => (
                      <div key={v.n} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 place-items-center rounded-full bg-white/10 text-xs font-bold">{v.n.split(" ").map((n) => n[0]).join("")}</span>
                          <div><p className="text-xs font-semibold">{v.n}</p><p className="text-xs text-white/70">{v.t}</p></div>
                        </div>
                        <div className="text-right"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.c}`}>{v.s}</span><p className="mt-0.5 text-xs text-white/70">{v.time}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-blush-400/20 bg-blush-400/10 px-3 py-2.5">
                    <div className="flex items-center gap-2"><BellRing className="size-3.5 text-blush-300" /><span className="text-xs font-semibold">Panic alert · A-503</span></div>
                    <span className="rounded-full bg-blush-400 px-2 py-1 text-xs font-bold text-[#3a1020]">Acknowledge</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-2.5"><Fingerprint className="size-4 text-white/80" /><span className="text-xs text-white/80">Gate actions are recorded in the audit log</span></div>
                  <ArrowUpRight className="size-4 text-white/70" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Open source ─────────────────────────────────────────────── */}
        <section id="open-source" className="scroll-mt-24 border-y border-line bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-[1180px] landing-gutter">
            <div className="grid grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-2">
              <Reveal>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Open source, by design</p>
                <h2 className="mt-3 max-w-lg text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[44px]">Software your community can <span className="font-display italic text-brand-600">actually own.</span></h2>
                <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink-soft">No per-resident licence. No vendor holding your data hostage. Nivaasa is open source and self-hostable, with a clean API and native mobile apps. Bring your own server, payment gateway and identity provider.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Code2, t: "Readable TypeScript", d: "TypeScript end to end, with a documented schema." },
                    { icon: Server, t: "One-command deploy", d: "Docker or Node, with SQLite included." },
                    { icon: Smartphone, t: "Native apps included", d: "Expo builds for Android and iOS, plus a PWA." },
                    { icon: Globe2, t: "Your integrations", d: "Demo payments included; connect your own providers." },
                  ].map((f) => (
                    <div key={f.t} className="flex gap-3 rounded-xl border border-line bg-[#fbfcff] p-3.5">
                      <f.icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <div><p className="text-xs font-semibold text-ink">{f.t}</p><p className="mt-0.5 text-xs leading-relaxed text-muted">{f.d}</p></div>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="overflow-hidden rounded-2xl border border-[#24344f] bg-[#0f1c33] shadow-[0_30px_80px_-30px_rgba(15,28,51,0.6)]">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-[#ff6b6b]/70" /><span className="size-2.5 rounded-full bg-[#ffd166]/70" /><span className="size-2.5 rounded-full bg-[#5fd38d]/70" /></div>
                    <span className="font-mono text-xs text-white/70">terminal — nivaasa</span>
                  </div>
                  <pre className="max-w-full whitespace-pre-wrap break-words p-4 font-mono text-xs leading-[1.9] text-white/70 sm:p-5"><code><span className="text-white/70"># clone and run your community</span>{"\n"}<span className="text-blush-300">$</span> git clone https://github.com/your-org/nivaasa{"\n"}<span className="text-blush-300">$</span> cd nivaasa{"\n"}<span className="text-blush-300">$</span> npm install{"\n"}<span className="text-blush-300">$</span> npm run setup{"\n"}<span className="text-blush-300">$</span> npm run dev{"\n\n"}<span className="text-emerald-300">✓</span> DB seeded at data/nivaasa.db{"\n"}<span className="text-emerald-300">✓</span> Web ready at http://localhost:3000{"\n"}<span className="text-emerald-300">✓</span> Mobile ready with Expo{"\n\n"}<span className="text-white/70"># demo: resident@nivaasa.app / demo1234</span></code></pre>
                </div>
              </Reveal>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { t: "Self-hosted", p: "Free", d: "Everything in the box. Your server, your database, your rules.", cta: "Run the demo", href: "/login?demo=1", featured: false },
                { t: "For your community", p: "Your workspace", d: "Set up your society, homes and first administrator.", cta: "Set up a community", href: "/onboarding", featured: true },
                { t: "Explore first", p: "Live demo", d: "Try the resident, community admin and guard experiences with sample data.", cta: "Explore the demo", href: "/login?demo=1", featured: false },
              ].map((p) => (
                <div key={p.t} className={`rounded-[24px] border p-6 ${p.featured ? "border-brand-600 bg-brand-600 text-white shadow-glow" : "border-line bg-white shadow-soft"}`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.14em] ${p.featured ? "text-white/80" : "text-muted"}`}>{p.t}</p>
                  <p className={`mt-3 text-[30px] font-semibold tracking-[-0.04em] ${p.featured ? "text-white" : "text-ink"}`}>{p.p}</p>
                  <p className={`mt-2 text-sm leading-relaxed ${p.featured ? "text-white/65" : "text-ink-soft"}`}>{p.d}</p>
                  <Link href={p.href} className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${p.featured ? "text-white" : "text-brand-600"}`}>{p.cta} <ArrowRight className="size-3.5" /></Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community voices ───────────────────────────────────────── */}
        <section className="landing-gutter py-20 sm:py-24">
          <div className="mx-auto max-w-[1180px]">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blush-500">Built for every role</p>
                  <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-ink sm:text-[40px]">Different jobs. Same calm.</h2>
                </div>
                <p className="text-xs font-medium text-muted">Stories from the Nivaasa demo community.</p>
              </div>
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { q: "I used to chase the guard for delivery updates. Now I approve from a meeting and get on with my day.", n: "Aarav Mehta", r: "Resident · A-402", c: "AM", bg: "bg-brand-100 text-brand-700" },
                { q: "The audit pack that used to take a week is a report now. Every rupee has a trail, and the committee can see it live.", n: "Priya Nair", r: "Community Manager", c: "PN", bg: "bg-blush-100 text-blush-600" },
                { q: "The gate console is faster than our register — and I can see a resident's approval without calling them twice.", n: "Ramesh Yadav", r: "Head Security · Gate 1", c: "RY", bg: "bg-mint-50 text-mint-600" },
              ].map((t, i) => (
                <Reveal key={t.n} delay={i * 0.05}>
                  <figure className="h-full rounded-[24px] border border-line bg-white p-6 shadow-soft">
                    <div className="flex gap-0.5 text-amber-ink">{"★★★★★".split("").map((s, j) => <span key={j} className="text-xs">{s}</span>)}</div>
                    <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">“{t.q}”</blockquote>
                    <figcaption className="mt-6 flex items-center gap-2.5">
                      <span className={`grid size-9 place-items-center rounded-full text-xs font-bold ${t.bg}`}>{t.c}</span>
                      <div><p className="text-xs font-semibold text-ink">{t.n}</p><p className="text-xs text-muted">{t.r}</p></div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1180px] gap-10 landing-gutter lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Questions, answered</p>
              <h2 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">A few things<br />worth knowing.</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">Everything else lives in the docs. If you&apos;d rather talk to a human, we&apos;re here.</p>
              <Link href="/login?demo=1" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">Open the demo <ArrowRight className="size-3.5" /></Link>
            </Reveal>
            <div className="divide-y divide-line">
              {[
                { q: "Is Nivaasa really a MyGate alternative?", a: "Yes — it covers the same core ground: gate and visitor management, community communication, helpdesk, amenities, maintenance billing, accounting and administration. The difference is ownership: Nivaasa is open source and runs on infrastructure you control, with no per-resident licence." },
                { q: "Can I import my existing society data?", a: "The data model is documented and import scripts are included for residents, units, opening balances and vendor records. Larger migrations can be handled as a one-time project." },
                { q: "How do payments work?", a: "The demo uses a simulated payment gateway so you can test the complete flow safely. In production, connect Razorpay, Stripe or a UPI provider through environment variables. Offline payments (NEFT, cheque, cash) have a separate verification workflow." },
                { q: "Do residents need to install an app?", a: "No. The responsive web app works beautifully on phones and can be installed as a PWA. Native Android and iOS apps are included via Expo for communities that want push notifications and a home-screen presence." },
                { q: "What about data privacy?", a: "Resident directories are opt-in and masked. Access is role-based, actions are audit-logged, and sensitive fields are purpose-limited. Because you self-host, no third party receives your community data unless you choose a managed plan." },
                { q: "Can it handle multiple towers or societies?", a: "Yes. Towers, units, gates and amenities are first-class concepts, and portfolio owners can switch between societies. A single deployment can host an entire township or a management company's portfolio." },
              ].map((f) => (
                <details key={f.q} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[14px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform group-open:rotate-45 group-open:border-brand-200 group-open:text-brand-600">+</span>
                  </summary>
                  <p className="max-w-2xl pb-5 pr-8 text-sm leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section id="cta" className="scroll-mt-24 landing-gutter [--landing-gutter:0.75rem] py-16 sm:[--landing-gutter:1.25rem] sm:py-24">
          <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[32px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-blush-50 px-6 py-14 text-center shadow-soft sm:py-20">
            <div className="absolute inset-0 dot-paper opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="relative mx-auto max-w-2xl">
              <MarkReveal size={190} variant="blue" className="mx-auto" />
              <h2 className="mt-6 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[48px]">Bring your community <span className="font-display italic text-brand-600">home.</span></h2>
              <p className="mx-auto mt-4 max-w-lg text-[14.5px] leading-relaxed text-ink-soft">Step into a fully seeded demo community. Approve a visitor, pay a bill, resolve a ticket — see how the whole system fits together.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/login?demo=1" className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-[0_16px_36px_-14px_rgba(49,85,216,0.7)] transition-transform hover:-translate-y-0.5">Enter the demo community <ArrowRight className="size-4" /></Link>
                <a href="#open-source" className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-white px-5 text-sm font-semibold text-ink hover:bg-canvas">Self-host it</a>
              </div>
              <p className="mt-4 text-xs text-muted">Demo logins are on the sign-in page. No email required.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto max-w-[540px] lg:mr-0">
      <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 shadow-[0_40px_80px_-32px_rgba(19,26,42,0.35)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="text-xs font-semibold text-ink">Verdant Heights</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-mint-50 px-2 py-1 text-xs font-bold text-mint-600 sm:inline">● All calm</span>
            <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">PN</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-muted">Good morning, Priya</p>
              <p className="mt-0.5 text-[18px] font-semibold tracking-[-0.03em] text-ink">Here&apos;s your community, today.</p>
            </div>
            <span className="hidden rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft sm:inline">Tue, 4 Nov</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 min-[480px]:grid-cols-3">
            {[
              { l: "Collected", v: "₹18.6L", h: "84% of billed", c: "bg-gradient-to-br from-brand-600 to-brand-800 text-white" },
              { l: "Outstanding", v: "₹2.4L", h: "42 invoices", c: "bg-white border border-line" },
              { l: "Open tickets", v: "7", h: "2 near SLA", c: "bg-blush-50 border border-blush-200" },
            ].map((s) => (
              <div key={s.l} className={`min-w-0 rounded-xl p-2 sm:p-3 ${s.l === "Collected" ? "col-span-full min-[480px]:col-span-1" : ""} ${s.c}`}>
                <p className={`break-words text-xs font-semibold uppercase tracking-[0.04em] ${s.l === "Collected" ? "text-white/80" : "text-muted"}`}>{s.l}</p>
                <p className={`mt-1 text-[19px] font-semibold tracking-[-0.03em] ${s.l === "Collected" ? "text-white" : "text-ink"}`}>{s.v}</p>
                <p className={`mt-0.5 text-xs ${s.l === "Collected" ? "text-white/80" : "text-ink-soft"}`}>{s.h}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">Collections this year</p>
                <p className="text-xs text-muted">Apr — Nov</p>
              </div>
              <div className="mt-2 flex h-[86px] items-end gap-1.5">
                {[44, 55, 48, 66, 59, 74, 70, 86].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col justify-end gap-1">
                    <div className={`w-full rounded-t-[3px] ${i === 7 ? "bg-brand-600" : "bg-brand-200"}`} style={{ height: Math.round(h * 0.74) }} />
                    <span className="text-center text-xs text-muted">{["A", "M", "J", "J", "A", "S", "O", "N"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-[#fbfcff] p-2.5">
                <div className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-brand-600" /><p className="text-xs font-semibold text-ink">At the gate</p></div>
                <p className="mt-1 text-[14px] font-semibold text-ink">3</p>
                <p className="text-xs text-muted">awaiting approval</p>
              </div>
              <div className="rounded-xl bg-blush-50 p-2.5">
                <div className="flex items-center gap-1.5"><Wrench className="size-3 text-blush-500" /><p className="text-xs font-semibold text-ink">SLA at risk</p></div>
                <p className="mt-1 text-[14px] font-semibold text-ink">2</p>
                <p className="text-xs text-muted">tickets to review</p>
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-line p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink">Needs your attention</p>
              <p className="text-xs font-medium text-brand-600">View all</p>
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                { t: "Offline payment to verify", s: "Aarav Mehta · NEFT · ₹6,054", c: "bg-amber-soft text-amber-ink", b: "Verify" },
                { t: "New discussion in moderation", s: "Riya Sen · C-101", c: "bg-brand-50 text-brand-700", b: "Review" },
              ].map((r) => (
                <div key={r.t} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-blush-400" />
                    <div><p className="text-xs font-semibold text-ink">{r.t}</p><p className="text-xs text-muted">{r.s}</p></div>
                  </div>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${r.c}`}>{r.b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-3 w-full rounded-2xl sm:absolute sm:-bottom-5 sm:mt-0 sm:w-[210px] border border-line bg-white p-3 shadow-[0_24px_50px_-20px_rgba(19,26,42,0.3)] sm:-left-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-blush-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blush-600">Visitor approval</span>
          <span className="text-xs text-muted">Now</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-[#fdf1f5] text-xs font-bold text-blush-600">YS</span>
          <div><p className="text-xs font-semibold text-ink">Yash Sharma</p><p className="text-xs text-muted">Swiggy · A-402</p></div>
        </div>
        <div className="mt-2 grid grid-cols-[auto_1fr_1fr] gap-1">
          <span className="grid size-6 place-items-center rounded-lg bg-canvas text-xs text-muted">×</span>
          <span className="rounded-lg border border-line py-1 text-center text-xs font-semibold text-ink-soft">Leave at gate</span>
          <span className="rounded-lg bg-mint-600 py-1 text-center text-xs font-semibold text-white">Approve</span>
        </div>
      </div>

      <div className="absolute -right-2 -top-4 hidden rounded-2xl border border-line bg-white/95 px-3 py-2 shadow-[0_20px_45px_-20px_rgba(19,26,42,0.3)] backdrop-blur sm:block">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-mint-50 text-mint-600"><Check className="size-3" strokeWidth={3} /></span>
          <div><p className="text-xs font-semibold text-ink">₹5,935 received</p><p className="text-xs text-muted">UPI · receipt sent</p></div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line bg-[#0f1c33] landing-gutter pt-14 pb-[calc(3.5rem+env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="light" size={34} showTagline />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">The open-source operating system for gated communities. Security, community, payments and accounting — owned by the people who live there.</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-white/70">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Built for India, ready everywhere
            </div>
          </div>
          {[
            { h: "Platform", l: [["Gate & security", "/#platform"], ["Community", "/#resident"], ["Payments & ERP", "/#admin"], ["Amenities", "/#platform"], ["Helpdesk", "/#platform"]] },
            { h: "Community", l: [["Resident app", "/login?demo=1"], ["Admin console", "/login?demo=1"], ["Guard console", "/login?demo=1"], ["Mobile apps", "/#open-source"], ["Set up a community", "/onboarding"] ] },
            { h: "Open source", l: [["Documentation", "/#open-source"], ["Deploy guide", "/#open-source"], ["Data model", "/#open-source"], ["Self-hosting", "/#open-source"], ["Contribute", "/#open-source"]] },
          ].map((col) => (
            <div key={col.h}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{col.h}</p>
              <ul className="mt-4 space-y-2.5">
                {col.l.map(([l, h]) => <li key={l}><Link href={h} className="text-sm text-white/80 transition-colors hover:text-white">{l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-white/70">© {new Date().getFullYear()} Nivaasa. Open source under the MIT licence.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70">
            <Link href="/#security" className="hover:text-white/70">Privacy</Link>
            <Link href="/#security" className="hover:text-white/70">Security</Link>
            <Link href="/#open-source" className="hover:text-white/70">Licence</Link>
            <span className="inline-flex items-center gap-1"><Globe2 className="size-3" /> English · India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
