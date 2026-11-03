import { QueryTabs } from "@/components/ui/query-tabs";
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
  const closedWithTime = resolved.filter(({ ticket }) => ticket.resolvedAt);
  const averageClosure = closedWithTime.length ? closedWithTime.reduce((total, { ticket }) => total + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3600000, 0) / closedWithTime.length : null;
  const filters = [
    { v: "all", l: "All", c: rows.length },
    { v: "in_progress", l: "In progress", c: rows.filter((r) => r.ticket.status === "in_progress").length },
    { v: "open", l: "Open", c: rows.filter((r) => r.ticket.status === "open").length },
    { v: "resolved", l: "Resolved", c: rows.filter((r) => r.ticket.status === "resolved").length },
    { v: "closed", l: "Closed", c: rows.filter((r) => r.ticket.status === "closed").length },
  ];

  return (
    <div>
      <PageHeader eyebrow="Here to help" title="Helpdesk" description="Raise a request, follow its progress and know exactly who is working on it. No more chasing WhatsApp groups." actions={<Link href="/app/helpdesk/new" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"><Plus aria-hidden="true" className="size-4" /> <span>Raise a request</span></Link>} />

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Open requests" value={open.length} hint={open.length ? "Being worked on" : "All clear"} tone={open.length ? "blue" : "green"} icon={<Wrench className="size-4" />} />
        <Stat label="Resolved" value={resolved.length} hint="All time" tone="green" icon={<CheckCircle2 className="size-4" />} />
        <Stat label="Average resolution" value={averageClosure === null ? "—" : `${averageClosure.toFixed(1)}h`} hint={closedWithTime.length ? `Across ${closedWithTime.length} resolved requests` : "No resolved requests yet"} icon={<Clock3 className="size-4" />} />
        <Stat label="Satisfaction" value={avg} hint={`${rated.length} ratings`} tone="pink" icon={<Star className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0">
          <QueryTabs className="mb-4" label="Request status" basePath="/app/helpdesk" param="status" value={filter} items={filters.map((f) => ({ value: f.v, label: f.l, count: f.c }))} />
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
                      <div className="flex flex-wrap items-center gap-1.5"><Badge variant={meta.variant}>{meta.label}</Badge>{t.priority === "high" || t.priority === "urgent" ? <Badge variant={t.priority === "urgent" ? "danger" : "warning"}><AlertTriangle className="size-4" />{t.priority}</Badge> : null}<span className="text-caption text-muted">#{t.id.slice(0, 6).toUpperCase()}</span></div>
                      <p className="mt-1.5 text-body font-semibold leading-snug text-ink group-hover:text-brand-700">{t.subject}</p>
                      <p className="mt-0.5 line-clamp-1 text-caption text-muted">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
                        <span>{t.category} · {t.scope === "personal" ? "My home" : "Common area"}</span>
                        <span>Updated {timeAgo(t.updatedAt)}</span>
                        {assignee ? <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-canvas px-2 py-1 font-medium text-ink-soft"><Avatar name={assignee.name} color={assignee.avatarColor} size="xs" className="!size-5 !text-caption" /><span className="truncate">{assignee.name}</span></span> : null}
                        {overdue ? <span className="font-semibold text-[#c43d4d]">SLA overdue</span> : null}
                      </div>
                    </div>
                    <ChevronRight className="mt-2 size-4 shrink-0 text-[#c2c8d5] group-hover:text-brand-500" />
                  </div>
                </Link>
              );
            })}
            {!filtered.length ? <Card><EmptyState icon={<CheckCircle2 className="size-6" />} title={filter === "all" ? "No requests yet" : "Nothing here"} description={filter === "all" ? "When something needs fixing, raise a request and the team will take it from there." : "No requests with this status right now."} action={<Link href="/app/helpdesk/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-caption font-semibold text-white">Raise a request</Link>} /></Card> : null}
          </div>
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader title="Your service promise" description="How we respond" icon={<ShieldCheck className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              {[["Urgent", "4 hours"], ["High", "8 hours"], ["Normal", "24 hours"], ["Low", "48 hours"]].map(([p, s]) => <div key={p} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-caption font-medium text-ink-soft">{p}</span><span className="rounded-full bg-canvas px-2 py-0.5 text-caption font-semibold text-ink">{s}</span></div>)}
              <p className="mt-2 text-caption leading-relaxed text-muted">Requests escalate automatically when the SLA is breached — to the helpdesk manager, then the community manager.</p>
            </div>
          </Card>
          <div className="rounded-[18px] bg-gradient-to-br from-blush-50 to-brand-50 p-5">
            <p className="text-body font-semibold text-ink">Help us improve</p>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-soft">After a request is resolved, rate the experience. It helps the committee hold vendors accountable and recognise good work.</p>
            <div className="mt-3 flex items-center gap-1 text-amber-ink">{"★★★★★".split("").map((s, i) => <span key={i} className="text-body">{s}</span>)}</div>
          </div>
          <Link href="/app/emergency" className="flex items-center justify-between rounded-[18px] border border-[#f3d0d4] bg-[#fdf1f3] p-4"><div><p className="text-caption font-semibold text-[#a82f3e]">Emergency?</p><p className="mt-0.5 text-caption text-[#c0606c]">Alert the guard and community team now.</p></div><ArrowRight className="size-4 text-[#c43d4d]" /></Link>
        </aside>
      </div>
    </div>
  );
}
