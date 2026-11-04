import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { AlertTriangle, ArrowDownToLine, ChevronRight, Clock3, Search, Star, Wrench } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { requireAdminRole } from "@/lib/queries";
import { db } from "@/db";
import { helpdeskTickets, units, users } from "@/db/schema";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata = { title: "Helpdesk" };

export const dynamic = "force-dynamic";

const statusMeta: Record<string, { l: string; v: "blue" | "warning" | "success" | "danger" | "neutral" | "purple" }> = { open: { l: "Open", v: "blue" }, assigned: { l: "Assigned", v: "purple" }, in_progress: { l: "In progress", v: "warning" }, resolved: { l: "Resolved", v: "success" }, closed: { l: "Closed", v: "neutral" }, reopened: { l: "Reopened", v: "danger" } };

export default async function AdminHelpdeskPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; category?: string }> }) {
  const ctx = await requireAdminRole(["admin", "manager", "committee", "helpdesk_manager"]);
  const societyId = ctx.society!.id;
  const params = await searchParams;
  const status = params.status ?? "all";
  const category = params.category ?? "all";
  const q = (params.q ?? "").toLowerCase();
  const rows = await db.select({ ticket: helpdeskTickets, unit: units.number, requester: users.name, requesterColor: users.avatarColor, assignee: users.name, assigneeColor: users.avatarColor })
    .from(helpdeskTickets).leftJoin(units, eq(helpdeskTickets.unitId, units.id)).innerJoin(users, eq(helpdeskTickets.raisedBy, users.id))
    .where(eq(helpdeskTickets.societyId, societyId)).orderBy(desc(helpdeskTickets.updatedAt));
  const filtered = rows.filter((r) => (status === "all" || r.ticket.status === status) && (category === "all" || r.ticket.category === category) && (!q || r.ticket.subject.toLowerCase().includes(q) || (r.unit ?? "").toLowerCase().includes(q) || r.requester.toLowerCase().includes(q)));
  const open = rows.filter((r) => ["open", "assigned", "in_progress", "reopened"].includes(r.ticket.status));
  const overdue = open.filter((r) => r.ticket.slaDueAt && r.ticket.slaDueAt < new Date());
  const rated = rows.filter((r) => r.ticket.rating);
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.ticket.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  const resolved = rows.filter(({ ticket }) => ticket.resolvedAt);
  const averageClosure = resolved.length ? resolved.reduce((total, { ticket }) => total + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3600000, 0) / resolved.length : null;
  const categories = [...new Set(rows.map((r) => r.ticket.category))];
  return (
    <div>
      <PageHeader eyebrow="Service operations" title="Helpdesk" description="Every resident request, assigned with an SLA and closed with a rating. See where service is stuck." actions={<a href="/api/admin/export?type=tickets" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-caption font-semibold text-ink-soft hover:bg-canvas"><ArrowDownToLine className="size-4" /> Export</a>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Open requests" value={open.length} hint={overdue.length ? `${overdue.length} past SLA` : "Within SLA"} tone={overdue.length ? "pink" : "blue"} icon={<Wrench className="size-4" />} />
        <Stat label="Resolved" value={rows.filter((r) => ["resolved", "closed"].includes(r.ticket.status)).length} hint="All time" tone="green" icon={<Clock3 className="size-4" />} />
        <Stat label="Avg. resolution" value={averageClosure === null ? "—" : `${averageClosure.toFixed(1)}h`} hint={`${resolved.length} resolved requests`} icon={<Clock3 className="size-4" />} />
        <Stat label="Satisfaction" value={avg} hint={`${rated.length} ratings`} tone="pink" icon={<Star className="size-4" />} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-wrap gap-1.5">{[{ v: "all", l: "All" }, { v: "open", l: "Open" }, { v: "in_progress", l: "In progress" }, { v: "resolved", l: "Resolved" }, { v: "reopened", l: "Reopened" }].map((s) => <Link key={s.v} href={`/admin/helpdesk?${new URLSearchParams({ status: s.v, category, q: params.q ?? "" })}`} aria-current={status === s.v ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-caption font-semibold ${status === s.v ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>{s.l}</Link>)}</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">{["all", ...categories].map((c) => <Link key={c} href={`/admin/helpdesk?${new URLSearchParams({ status, category: c, q: params.q ?? "" })}`} aria-current={category === c ? "page" : undefined} className={`shrink-0 rounded-full px-2.5 py-1 text-caption font-medium capitalize ${category === c ? "bg-ink text-white" : "bg-canvas text-muted"}`}>{c}</Link>)}</div>
            <form action="/admin/helpdesk" className="flex min-h-11 items-center gap-2 rounded-full border border-line px-3 sm:w-72"><Search className="size-4 text-muted" /><input type="hidden" name="status" value={status} /><input type="hidden" name="category" value={category} /><input name="q" aria-label="Search requests, homes or residents" enterKeyHint="search" defaultValue={params.q} placeholder="Search ticket, home, resident…" className="w-full bg-transparent text-caption outline-none placeholder:text-muted" /></form>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[860px]"><thead><tr className="bg-[#fbfcff]">{["Ticket", "Home", "Resident", "Category", "Priority", "Assignee", "SLA", "Status", ""].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-caption font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>
          {filtered.slice(0, 80).map((r) => {
            const meta = statusMeta[r.ticket.status] ?? statusMeta.open;
            const late = r.ticket.slaDueAt && r.ticket.slaDueAt < new Date() && ["open", "assigned", "in_progress", "reopened"].includes(r.ticket.status);
            return <tr key={r.ticket.id} className="border-b border-line/70 last:border-0 hover:bg-[#fbfcff]"><td className="px-4 py-3"><Link href={`/admin/helpdesk/${r.ticket.id}`} className="text-caption font-semibold text-ink hover:text-brand-600">{r.ticket.subject}</Link><p className="text-caption text-muted">#{r.ticket.id.slice(0, 6).toUpperCase()} · {r.ticket.scope === "personal" ? "Private" : "Common"}</p></td><td className="px-4 py-3 text-caption font-medium text-ink">{r.unit ?? "—"}</td><td className="px-4 py-3"><div className="flex items-center gap-1.5"><Avatar name={r.requester} color={r.requesterColor} size="xs" /><span className="text-caption text-ink-soft">{r.requester}</span></div></td><td className="px-4 py-3 text-caption text-muted">{r.ticket.category}</td><td className="px-4 py-3"><Badge variant={r.ticket.priority === "urgent" ? "danger" : r.ticket.priority === "high" ? "warning" : "outline"}>{r.ticket.priority}</Badge></td><td className="px-4 py-3">{r.assignee ? <div className="flex items-center gap-1.5"><Avatar name={r.assignee} color={r.assigneeColor} size="xs" /><span className="text-caption text-ink-soft">{r.assignee}</span></div> : <span className="text-caption text-muted">Unassigned</span>}</td><td className="px-4 py-3">{r.ticket.slaDueAt ? <span className={`text-caption ${late ? "font-semibold text-[#c43d4d]" : "text-muted"}`}>{late ? "Overdue" : formatDate(r.ticket.slaDueAt)}</span> : <span className="text-caption text-muted">—</span>}</td><td className="px-4 py-3"><Badge variant={meta.v}>{meta.l}</Badge></td><td className="px-4 py-3"><Link href={`/admin/helpdesk/${r.ticket.id}`} className="text-caption font-semibold text-brand-600">Open</Link></td></tr>;
          })}
        </tbody></table></div>
        {!filtered.length ? <EmptyState icon={<Wrench className="size-6" />} title="No tickets match" description="Adjust filters or wait for the next request." /> : null}
      </Card>
    </div>
  );
}
