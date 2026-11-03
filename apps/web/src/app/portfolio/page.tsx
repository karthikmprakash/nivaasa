import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  ArrowRight, ArrowUpRight, Building2, CheckCircle2, ChevronRight, LayoutGrid, LogOut, ShieldCheck,
  Sparkles, TrendingUp, Users, Wallet, Wrench,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Avatar, Badge, Card, CardHeader, ProgressBar, Stat } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { db } from "@/db";
import { helpdeskTickets, invoices, memberships, payments, societies, units, users, visitors } from "@/db/schema";
import { formatINR, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Portfolio" };

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.globalRole !== "super_admin") redirect("/admin");
  const allSocieties = await db.select().from(societies).orderBy(desc(societies.createdAt));
  const [unitRows, invoiceRows, paymentRows, ticketRows, visitorRows, admins] = await Promise.all([
    db.select({ societyId: units.societyId, c: count(), occupied: sql<number>`sum(case when status='occupied' then 1 else 0 end)` }).from(units).groupBy(units.societyId),
    db.select({ societyId: invoices.societyId, total: sql<number>`coalesce(sum(case when status in ('due','overdue','partially_paid') then total - amount_paid else 0 end),0)`, billed: sql<number>`coalesce(sum(total),0)`, paid: sql<number>`coalesce(sum(amount_paid),0)`, c: sql<number>`sum(case when status in ('due','overdue','partially_paid') then 1 else 0 end)` }).from(invoices).groupBy(invoices.societyId),
    db.select({ societyId: payments.societyId, total: sql<number>`coalesce(sum(amount),0)` }).from(payments).where(eq(payments.status, "success")).groupBy(payments.societyId),
    db.select({ societyId: helpdeskTickets.societyId, c: count() }).from(helpdeskTickets).where(inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"])).groupBy(helpdeskTickets.societyId),
    db.select({ societyId: visitors.societyId, c: count() }).from(visitors).where(gte(visitors.createdAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1))).groupBy(visitors.societyId),
    db.select({ societyId: memberships.societyId, name: users.name, color: users.avatarColor }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(inArray(memberships.role, ["admin", "manager"])),
  ]);
  const unitBy = new Map(unitRows.map((u) => [u.societyId, u]));
  const invBy = new Map(invoiceRows.map((i) => [i.societyId, i]));
  const payBy = new Map(paymentRows.map((p) => [p.societyId, p]));
  const ticketBy = new Map(ticketRows.map((t) => [t.societyId, t.c]));
  const visitorBy = new Map(visitorRows.map((v) => [v.societyId, v.c]));
  const adminBy = new Map(admins.map((a) => [a.societyId, a]));
  const totals = allSocieties.reduce((acc, s) => {
    const u = unitBy.get(s.id); const inv = invBy.get(s.id);
    acc.homes += u?.c ?? 0; acc.outstanding += inv?.total ?? 0; acc.collected += payBy.get(s.id)?.total ?? 0; acc.tickets += ticketBy.get(s.id) ?? 0;
    return acc;
  }, { homes: 0, outstanding: 0, collected: 0, tickets: 0 });
  return (
    <div className="min-h-dvh bg-[#f5f6fa]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-3"><Logo size={31} /><span className="h-5 w-px bg-line" /><span className="text-[10px] font-semibold text-muted">Portfolio</span></div>
          <div className="flex items-center gap-2"><Badge variant="blue"><LayoutGrid className="size-3" /> Portfolio owner</Badge><Avatar name={session.user.name} color={session.user.avatarColor} size="sm" /><div className="hidden sm:block"><p className="text-[10px] font-semibold text-ink">{session.user.name}</p><p className="text-[8px] text-muted">{session.user.email}</p></div><form action={logoutAction}><button aria-label="Sign out" className="grid size-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-[#c43d4d]"><LogOut className="size-3.5" /></button></form></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-5 py-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">Your communities</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.04em] text-ink">The whole portfolio, in view.</h1>
        <p className="mt-1.5 text-[12px] text-ink-soft">Financial health, operations and team across every society you manage.</p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat label="Communities" value={allSocieties.length} hint="Under management" tone="blue" icon={<Building2 className="size-4" />} />
          <Stat label="Homes" value={totals.homes} hint="Across the portfolio" icon={<Users className="size-4" />} />
          <Stat label="Collected" value={formatINR(totals.collected)} hint="Lifetime, successful payments" tone="green" icon={<Wallet className="size-4" />} />
          <Stat label="Outstanding" value={formatINR(totals.outstanding)} hint={`${totals.tickets} open tickets`} tone="pink" icon={<Wrench className="size-4" />} />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {allSocieties.map((s) => {
            const u = unitBy.get(s.id); const inv = invBy.get(s.id); const collected = payBy.get(s.id)?.total ?? 0; const admin = adminBy.get(s.id);
            const occupancy = Math.round(((u?.occupied ?? 0) / Math.max(1, u?.c ?? 1)) * 100);
            const collectionRate = inv?.billed ? Math.round((Number(inv.paid) / Number(inv.billed)) * 100) : 0;
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-br from-[#fbfcff] to-brand-50/40 p-5">
                  <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><LogoMark size={28} /></span><div><p className="text-[14px] font-semibold text-ink">{s.name}</p><p className="text-[9.5px] text-muted">{s.city}, {s.state} · {u?.c ?? 0} homes · est. {s.establishedYear}</p>{admin ? <div className="mt-1.5 flex items-center gap-1.5"><Avatar name={admin.name} color={admin.color} size="xs" /><span className="text-[8.5px] text-muted">{admin.name}</span></div> : null}</div></div>
                  <form action="/api/switch-society" method="post"><input type="hidden" name="slug" value={s.slug} /><button className="rounded-full bg-brand-600 px-3 py-1.5 text-[9px] font-semibold text-white">Open console</button></form>
                </div>
                <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                  {[{ l: "Collected", v: formatINR(collected) }, { l: "Outstanding", v: formatINR(inv?.total ?? 0) }, { l: "Open tickets", v: ticketBy.get(s.id) ?? 0 }, { l: "Gate entries", v: visitorBy.get(s.id) ?? 0 }].map((m) => <div key={m.l} className="bg-white px-3 py-3"><p className="text-[7.5px] font-semibold uppercase tracking-wide text-muted">{m.l}</p><p className="mt-1 text-[12px] font-semibold text-ink">{m.v}</p></div>)}
                </div>
                <div className="space-y-3 p-4">
                  <div><div className="flex justify-between text-[9px]"><span className="text-muted">Occupancy</span><span className="font-semibold text-ink">{occupancy}%</span></div><ProgressBar value={occupancy} tone="blue" className="mt-1.5" /></div>
                  <div><div className="flex justify-between text-[9px]"><span className="text-muted">Collection efficiency</span><span className="font-semibold text-ink">{collectionRate}%</span></div><ProgressBar value={collectionRate} tone="green" className="mt-1.5" /></div>
                  <div className="flex items-center justify-between border-t border-line pt-3"><span className="flex items-center gap-1.5 text-[8.5px] text-muted"><ShieldCheck className="size-3 text-mint-600" /> {s.registrationNo}</span><form action="/api/switch-society" method="post"><input type="hidden" name="slug" value={s.slug} /><button className="inline-flex items-center gap-1 text-[9px] font-semibold text-brand-600">Open admin <ArrowRight className="size-3" /></button></form></div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader title="Portfolio health" description="What needs a portfolio-level eye" icon={<TrendingUp className="size-4" />} /><div className="border-t border-line px-5 py-4"><div className="space-y-2.5">{allSocieties.map((s) => { const inv = invBy.get(s.id); const rate = inv?.billed ? Math.round((Number(inv.paid) / Number(inv.billed)) * 100) : 0; return <div key={s.id} className="flex items-center justify-between"><div><p className="text-[10px] font-semibold text-ink">{s.name}</p><p className="text-[8px] text-muted">{inv?.c ?? 0} open invoices</p></div><div className="flex items-center gap-3"><div className="h-1.5 w-28 rounded-full bg-[#eef1f8]"><div className="h-full rounded-full bg-brand-400" style={{ width: `${rate}%` }} /></div><span className="w-8 text-right text-[9px] font-semibold text-ink">{rate}%</span></div></div>; })}</div></div></Card>
          <Card><CardHeader title="Platform" description="Deployment status" icon={<Sparkles className="size-4" />} /><div className="border-t border-line px-4 py-3">{[["Database", "Healthy", true], ["Payments", "Demo gateway", true], ["Mobile API", "Online", true], ["Backups", "Daily · 02:00", true]].map(([l, v, ok]) => <div key={l as string} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-[9px] text-muted">{l}</span><span className={`inline-flex items-center gap-1 text-[8.5px] font-semibold ${ok ? "text-mint-600" : "text-amber-ink"}`}><CheckCircle2 className="size-2.5" /> {v}</span></div>)}</div></Card>
        </div>
      </main>
    </div>
  );
}
