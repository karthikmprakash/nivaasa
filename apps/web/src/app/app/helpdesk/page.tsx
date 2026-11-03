import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Clock3, Droplets, Dumbbell, ArrowUpDown,
  Lightbulb, Lock, MessageSquare, Package, Plus, ShieldCheck, Sparkles, Star, Wifi, Wrench,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { helpdeskTickets, users } from "@/db/schema";
import { formatDate, formatTime, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Helpdesk" };

export const dynamic = "force-dynamic";

const icons: Record<string, typeof Wrench> = {
  Plumbing: Droplets, Electrical: Lightbulb, Lifts: ArrowUpDown, Housekeeping: Sparkles, Security: ShieldCheck,
  Parking: Package, "Common areas": Dumbbell, Intercom: Lock, Internet: Wifi, Other: Wrench,
};

const statusMeta: Record<string, { label: string; variant: "blue" | "pink" | "success" | "warning" | "danger" | "neutral" }> = {
  open: { label: "Open", variant: "blue" },
  assigned: { label: "Assigned", variant: "purple" as never },
  in_progress: { label: "In progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  reopened: { label: "Reopened", variant: "danger" },
};

export default async function HelpdeskPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const filter = params.status ?? "all";
  const rows = await db.select({ ticket: helpdeskTickets, assignee: users }).from(helpdeskTickets).leftJoin(users, eq(helpdeskTickets.assigneeId, users.id)).where(eq(helpdeskTickets.unitId, ctx.unit.id)).orderBy(desc(helpdeskTickets.updatedAt));
  const filtered = filter === "all" ? rows : rows.filter((r) => r.ticket.status === filter);
  const open = rows.filter((r) => ["open", "assigned", "in_progress", "reopened"].includes(r.ticket.status));
  const resolved = rows.filter((r) => ["resolved", "closed"].includes(r.ticket.status));
  const rated = rows.filter((r) => r.ticket.rating);
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.ticket.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  const filters = [
    { v: "all", l: "All", c: rows.length },
    { v: "in_progress", l: "In progress", c: rows.filter((r) => r.ticket.status === "in_progress").length },
    { v: "open", l: "Open", c: rows.filter((r) => r.ticket.status === "open").length },
    { v: "resolved", l: "Resolved", c: rows.filter((r) => r.ticket.status === "resolved").length },
    { v: "closed", l: "Closed", c: rows.filter((r) => r.ticket.status === "closed").length },
  ];

  return (
    <div>
      <PageHeader eyebrow="Here to help" title="Helpdesk" description="Raise a request, follow its progress and know exactly who is working on it. No more chasing WhatsApp groups." actions={<Link href="/app/helpdesk/new" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(49,85,216,0.6)] hover:bg-brand-700"><Plus className="size-4" /> Raise a request</Link>} />

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Open requests" value={open.length} hint={open.length ? "Being worked on" : "All clear"} tone={open.length ? "blue" : "green"} icon={<Wrench className="size-4" />} />
        <Stat label="Resolved" value={resolved.length} hint="All time" tone="green" icon={<CheckCircle2 className="size-4" />} />
        <Stat label="Average response" value="3.8h" hint="Within your 24h SLA" icon={<Clock3 className="size-4" />} />
        <Stat label="Satisfaction" value={avg} hint={`${rated.length} ratings`} tone="pink" icon={<Star className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {filters.map((f) => <Link key={f.v} href={`/app/helpdesk${f.v === "all" ? "" : `?status=${f.v}`}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-semibold ${filter === f.v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}>{f.l}<span className={`rounded-full px-1.5 py-0.5 text-[8.5px] ${filter === f.v ? "bg-white/20" : "bg-canvas"}`}>{f.c}</span></Link>)}
          </div>
          <div className="space-y-2.5">
            {filtered.map(({ ticket: t, assignee }) => {
              const Icon = icons[t.category] ?? Wrench;
              const meta = statusMeta[t.status] ?? statusMeta.open;
              const overdue = t.slaDueAt && t.slaDueAt < new Date() && ["open", "assigned", "in_progress", "reopened"].includes(t.status);
              return (
                <Link key={t.id} href={`/app/helpdesk/${t.id}`} className="group block rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(19,26,42,0.03)] transition-all hover:border-brand-200 hover:shadow-soft sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.status === "resolved" || t.status === "closed" ? "bg-mint-50 text-mint-600" : t.priority === "urgent" ? "bg-[#fdeced] text-[#c43d4d]" : "bg-brand-50 text-brand-600"}`}><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><Badge variant={meta.variant}>{meta.label}</Badge>{t.priority === "high" || t.priority === "urgent" ? <Badge variant={t.priority === "urgent" ? "danger" : "warning"}><AlertTriangle className="size-2.5" />{t.priority}</Badge> : null}<span className="text-[9px] text-muted">#{t.id.slice(0, 6).toUpperCase()}</span></div>
                      <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-ink group-hover:text-brand-700">{t.subject}</p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-muted">
                        <span>{t.category} · {t.scope === "personal" ? "My home" : "Common area"}</span>
                        <span>Updated {timeAgo(t.updatedAt)}</span>
                        {assignee ? <span className="inline-flex items-center gap-1"><Avatar name={assignee.name} color={assignee.avatarColor} size="xs" className="!size-4 !text-[6px]" /> {assignee.name}</span> : null}
                        {overdue ? <span className="font-semibold text-[#c43d4d]">SLA overdue</span> : null}
                      </div>
                    </div>
                    <ChevronRight className="mt-2 size-3.5 shrink-0 text-[#c2c8d5] group-hover:text-brand-500" />
                  </div>
                </Link>
              );
            })}
            {!filtered.length ? <Card><EmptyState icon={<CheckCircle2 className="size-6" />} title={filter === "all" ? "No requests yet" : "Nothing here"} description={filter === "all" ? "When something needs fixing, raise a request and the team will take it from there." : "No requests with this status right now."} action={<Link href="/app/helpdesk/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-[11.5px] font-semibold text-white">Raise a request</Link>} /></Card> : null}
          </div>
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader title="Your service promise" description="How we respond" icon={<ShieldCheck className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              {[["Urgent", "4 hours"], ["High", "8 hours"], ["Normal", "24 hours"], ["Low", "48 hours"]].map(([p, s]) => <div key={p} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-[10.5px] font-medium text-ink-soft">{p}</span><span className="rounded-full bg-canvas px-2 py-0.5 text-[9px] font-semibold text-ink">{s}</span></div>)}
              <p className="mt-2 text-[9px] leading-relaxed text-muted">Requests escalate automatically when the SLA is breached — to the helpdesk manager, then the community manager.</p>
            </div>
          </Card>
          <div className="rounded-[18px] bg-gradient-to-br from-blush-50 to-brand-50 p-5">
            <p className="text-[12px] font-semibold text-ink">Help us improve</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">After a request is resolved, rate the experience. It helps the committee hold vendors accountable and recognise good work.</p>
            <div className="mt-3 flex items-center gap-1 text-amber-ink">{"★★★★★".split("").map((s, i) => <span key={i} className="text-[13px]">{s}</span>)}</div>
          </div>
          <Link href="/app/emergency" className="flex items-center justify-between rounded-[18px] border border-[#f3d0d4] bg-[#fdf1f3] p-4"><div><p className="text-[11px] font-semibold text-[#a82f3e]">Emergency?</p><p className="mt-0.5 text-[9.5px] text-[#c0606c]">Alert the guard and community team now.</p></div><ArrowRight className="size-4 text-[#c43d4d]" /></Link>
        </aside>
      </div>
    </div>
  );
}
