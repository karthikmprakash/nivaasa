import Link from "next/link";
import { and, desc, eq, like, or } from "drizzle-orm";
import { ArrowDownToLine, FileClock, Filter, Search, ShieldCheck } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { requireAdminRole } from "@/lib/queries";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export const dynamic = "force-dynamic";

const actionTone = (action: string) => action.includes("payment") ? "success" : action.includes("visitor") || action.includes("panic") ? "pink" : action.includes("invoice") || action.includes("expense") ? "blue" : action.includes("helpdesk") ? "warning" : "neutral";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; entity?: string }> }) {
  const ctx = await requireAdminRole(["admin", "manager", "auditor"]);
  const params = await searchParams;
  const q = params.q ?? "";
  const entity = params.entity ?? "all";
  const rows = await db.select({ log: auditLogs, actor: users }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(and(eq(auditLogs.societyId, ctx.society!.id), q ? or(like(auditLogs.action, `%${q}%`), like(auditLogs.actorName!, `%${q}%`)) : undefined, entity !== "all" ? eq(auditLogs.entity, entity) : undefined)).orderBy(desc(auditLogs.createdAt)).limit(100);
  const entities = [...new Set(rows.map((r) => r.log.entity))];
  return (
    <div>
      <PageHeader eyebrow="Governance" title="Audit log" description="An immutable trail of who did what, when. Every approval, payment and configuration change." actions={<div className="flex items-center gap-1.5 rounded-full border border-mint-600/20 bg-mint-50 px-3 py-2 text-caption font-semibold text-mint-600"><ShieldCheck className="size-4" /> Append-only record</div>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Events" value={rows.length} hint="Last 100 actions" tone="blue" icon={<FileClock className="size-4" />} />
        <Stat label="Entities" value={entities.length} hint="Across modules" icon={<Filter className="size-4" />} />
        <Stat label="Actors" value={new Set(rows.map((r) => r.log.actorId)).size} hint="People and system" tone="green" icon={<ShieldCheck className="size-4" />} />
        <Stat label="Log scope" value="Society" hint="Your community records" tone="pink" icon={<FileClock className="size-4" />} />
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">{["all", ...entities].map((e) => <Link key={e} href={`/admin/audit?entity=${e}`} className={`rounded-full px-2.5 py-1.5 text-caption font-semibold capitalize ${entity === e ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>{e}</Link>)}</div>
          <form action="/admin/audit" className="flex h-8 items-center gap-2 rounded-full border border-line px-3 sm:w-60"><Search className="size-4 text-muted" /><input name="q" aria-label="Search" enterKeyHint="search" defaultValue={params.q} placeholder="Search action or actor…" className="w-full bg-transparent text-caption outline-none placeholder:text-muted" /></form>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="bg-[#fbfcff]">{["Action", "Entity", "Actor", "Details", "When"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-caption font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{rows.map(({ log, actor }) => <tr key={log.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><Badge variant={actionTone(log.action) as never}><span className="font-mono text-caption">{log.action}</span></Badge></td><td className="px-4 py-2.5 text-caption capitalize text-ink-soft">{log.entity}</td><td className="px-4 py-2.5"><div className="flex items-center gap-1.5">{actor ? <Avatar name={actor.name} color={actor.avatarColor} size="xs" /> : <span className="grid size-6 place-items-center rounded-full bg-canvas text-caption">SYS</span>}<span className="text-caption text-ink-soft">{log.actorName ?? "System"}</span></div></td><td className="px-4 py-2.5"><p className="max-w-[300px] truncate text-caption text-muted">{log.metadata ? JSON.stringify(log.metadata) : "—"}</p></td><td className="px-4 py-2.5 text-caption text-muted">{formatDateTime(log.createdAt)}</td></tr>)}</tbody></table></div>
        {!rows.length ? <EmptyState icon={<FileClock className="size-6" />} title="No matching events" description="Try a different entity or search term." /> : null}
      </Card>
      <p className="mt-3 text-caption text-muted">Audit events are generated automatically for security, financial and governance actions. They cannot be edited from the console.</p>
    </div>
  );
}
