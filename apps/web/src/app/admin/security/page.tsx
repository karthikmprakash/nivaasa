import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock3, DoorOpen, MapPin, Package, Phone, ShieldAlert,
  ShieldCheck, Siren, UserCheck, UsersRound, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { VisitorApprovalCard } from "@/components/app/visitor-approval-card";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { deliveries, panicAlerts, patrolCheckpoints, patrolRounds, staff, staffAttendance, units, users, visitors } from "@/db/schema";
import { handlePanicAlert } from "@/lib/actions/admin";
import { getSocietyContacts, telHref } from "@/lib/society-contacts";
import { formatDate, formatTime, timeAgo, todayISO } from "@/lib/utils";

export const metadata = { title: "Security & gate" };

export const dynamic = "force-dynamic";

const statusTone: Record<string, "blue" | "pink" | "success" | "warning" | "danger" | "neutral"> = { pending: "warning", approved: "blue", entered: "pink", exited: "neutral", denied: "danger", expired: "neutral" };

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const { filter = "all" } = await searchParams;
  const today = todayISO();
  const [pending, recent, patrol, checkpoints, alerts, attendanceRows, staffRows, deliveryRows, societyContacts] = await Promise.all([
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(and(eq(visitors.societyId, societyId), eq(visitors.status, "pending"))).orderBy(desc(visitors.createdAt)),
    db.select({ visitor: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(eq(visitors.societyId, societyId)).orderBy(desc(visitors.createdAt)).limit(40),
    db.select({ round: patrolRounds, checkpoint: patrolCheckpoints }).from(patrolRounds).innerJoin(patrolCheckpoints, eq(patrolRounds.checkpointId, patrolCheckpoints.id)).where(and(eq(patrolRounds.societyId, societyId), gte(patrolRounds.scannedAt, new Date(today)))).orderBy(desc(patrolRounds.scannedAt)),
    db.select().from(patrolCheckpoints).where(eq(patrolCheckpoints.societyId, societyId)).orderBy(patrolCheckpoints.sortOrder),
    db.select({ alert: panicAlerts, user: users.name, unit: units.number }).from(panicAlerts).leftJoin(users, eq(panicAlerts.userId, users.id)).leftJoin(units, eq(panicAlerts.unitId, units.id)).where(and(eq(panicAlerts.societyId, societyId), inArray(panicAlerts.status, ["open", "acknowledged"]))).orderBy(desc(panicAlerts.createdAt)),
    db.select({ attendance: staffAttendance, person: staff }).from(staffAttendance).innerJoin(staff, eq(staffAttendance.staffId, staff.id)).where(and(eq(staffAttendance.societyId, societyId), eq(staffAttendance.date, today))).limit(10),
    db.select().from(staff).where(and(eq(staff.societyId, societyId), eq(staff.active, true), inArray(staff.kind, ["security", "society"]))),
    db.select({ count: sql<number>`count(*)` }).from(deliveries).where(and(eq(deliveries.societyId, societyId), gte(deliveries.createdAt, new Date(today)))),
    getSocietyContacts(societyId),
  ]);
  const gateContact = societyContacts.guard ?? societyContacts.security;
  const todayEntries = recent.filter((r) => r.visitor.createdAt >= new Date(today));
  const preApproved = recent.filter((r) => r.visitor.preApproved && ["approved", "pending"].includes(r.visitor.status));
  const missed = patrol.filter((p) => p.round.status === "missed");
  const scannedCheckpoints = new Set(patrol.filter((p) => p.round.status === "scanned").map((p) => p.round.checkpointId));
  const filteredVisitors = filter === "pending" ? recent.filter((r) => r.visitor.status === "pending") : filter === "entered" ? recent.filter((r) => r.visitor.status === "entered") : filter === "preapproved" ? recent.filter((r) => r.visitor.preApproved) : recent;

  return (
    <div>
      <PageHeader eyebrow="Gate & safety" title="Security & gate" description="Live gate activity, visitor approvals, patrol rounds, daily help and every incident in one place." actions={(["admin", "security_manager", "guard"].includes(ctx.membership?.role ?? "") || ctx.user.globalRole === "super_admin") ? <Link href="/gate" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-body font-semibold text-white hover:bg-brand-700"><DoorOpen className="size-4" /> Open guard console</Link> : undefined} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Entries today" value={todayEntries.length} hint={`${deliveryRows[0]?.count ?? 0} deliveries`} tone="blue" icon={<DoorOpen className="size-4" />} />
        <Stat label="Awaiting approval" value={pending.length} hint={pending.length ? "Resident action pending" : "Gate is clear"} tone="pink" icon={<Clock3 className="size-4" />} />
        <Stat label="Pre-approved" value={preApproved.length} hint="Active passes" tone="green" icon={<ShieldCheck className="size-4" />} />
        <Stat label="Patrol compliance" value={`${Math.round((scannedCheckpoints.size / Math.max(1, checkpoints.length)) * 100)}%`} hint={`${missed.length} missed check${missed.length === 1 ? "" : "s"}`} icon={<MapPin className="size-4" />} />
      </div>

      {alerts.length ? (
        <div className="mt-4 space-y-2">
          {alerts.map((a) => (
            <div key={a.alert.id} className="flex flex-col gap-3 rounded-2xl border border-[#f0c7cc] bg-gradient-to-r from-[#fdf1f3] to-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d94a5a] text-white pulse-ring"><Siren className="size-4" /></span><div><p className="text-body font-semibold text-ink">PANIC · Home {a.unit} · {a.user}</p><p className="text-caption text-[#9e4a55]">{a.alert.message} · {timeAgo(a.alert.createdAt)} · {a.alert.status}</p></div></div>
              <div className="flex gap-2">
                {a.alert.status === "open" ? <form action={handlePanicAlert}><input type="hidden" name="id" value={a.alert.id} /><input type="hidden" name="action" value="acknowledge" /><button className="rounded-full border border-[#e7a6ae] bg-white px-3 py-1.5 text-caption font-semibold text-[#a82f3e]">Acknowledge</button></form> : null}
                <form action={handlePanicAlert}><input type="hidden" name="id" value={a.alert.id} /><input type="hidden" name="action" value="resolve" /><button className="rounded-full bg-[#d94a5a] px-3 py-1.5 text-caption font-semibold text-white">Mark resolved</button></form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Waiting for approval" description="Residents are notified automatically" icon={<Clock3 className="size-4" />} action={pending.length ? <Badge variant="pink">{pending.length} waiting</Badge> : <Badge variant="success">All clear</Badge>} />
            <div className="border-t border-line p-4">
              {pending.length ? <div className="grid gap-2.5 sm:grid-cols-2">{pending.map(({ visitor: v }) => <VisitorApprovalCard key={v.id} visitor={{ ...v, createdAt: v.createdAt }} compact />)}</div> : <EmptyState icon={<ShieldCheck className="size-5" />} title="No one waiting" description="Every visitor has been handled." className="py-8" />}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent gate activity" description="Full visitor log for the community" icon={<DoorOpen className="size-4" />} action={<div className="flex gap-1">{["all", "pending", "entered", "preapproved"].map((f) => <Link key={f} href={`/admin/security?filter=${f}`} className={`rounded-full px-2 py-1 text-caption font-semibold capitalize ${filter === f ? "bg-brand-600 text-white" : "bg-canvas text-muted"}`}>{f}</Link>)}</div>} />
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[620px] text-left">
                <thead><tr className="border-b border-line bg-[#fbfcff]"><th className="px-4 py-2 text-caption font-bold uppercase tracking-[0.1em] text-muted">Visitor</th><th className="px-4 py-2 text-caption font-bold uppercase tracking-[0.1em] text-muted">Home</th><th className="px-4 py-2 text-caption font-bold uppercase tracking-[0.1em] text-muted">Type</th><th className="px-4 py-2 text-caption font-bold uppercase tracking-[0.1em] text-muted">Time</th><th className="px-4 py-2 text-right text-caption font-bold uppercase tracking-[0.1em] text-muted">Status</th></tr></thead>
                <tbody>{filteredVisitors.map(({ visitor: v, unit }) => <tr key={v.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar name={v.name} color={v.photoColor} size="xs" /><div><p className="text-caption font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ?? v.purpose ?? v.type}</p></div></div></td><td className="px-4 py-2.5 text-caption font-medium text-ink-soft">{unit ?? "—"}</td><td className="px-4 py-2.5 text-caption capitalize text-muted">{v.type.replace("_", " ")}</td><td className="px-4 py-2.5 text-caption text-muted">{timeAgo(v.createdAt)}</td><td className="px-4 py-2.5 text-right"><Badge variant={statusTone[v.status] ?? "neutral"}>{v.status}</Badge></td></tr>)}</tbody>
              </table>
              {!filteredVisitors.length ? <p className="px-4 py-8 text-center text-caption text-muted">No entries for this filter.</p> : null}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Patrol rounds today" description={`${scannedCheckpoints.size} of ${checkpoints.length} checkpoints scanned`} icon={<MapPin className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              <div className="space-y-2.5">
                {checkpoints.map((c) => {
                  const done = scannedCheckpoints.has(c.id);
                  return <div key={c.id} className="flex items-center gap-2.5"><span className={`grid size-6 place-items-center rounded-full ${done ? "bg-mint-50 text-mint-600" : "bg-canvas text-muted"}`}>{done ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}</span><div className="flex-1"><p className="text-caption font-medium text-ink">{c.name}</p><p className="text-caption text-muted">{c.location}</p></div><span className={`text-caption font-semibold ${done ? "text-mint-600" : "text-muted"}`}>{done ? "Scanned" : "Missed"}</span></div>;
                })}
              </div>
              {missed.length ? <p className="mt-3 rounded-lg bg-[#fdf1f3] px-2.5 py-2 text-caption text-[#9e4a55]">{missed.length} missed {missed.length === 1 ? "checkpoint" : "checkpoints"} today. The guard has been notified.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Staff on duty" description="Society staff checked in today" icon={<UserCheck className="size-4" />} action={<Link href="/admin/staff" className="text-caption font-semibold text-brand-600">All</Link>} />
            <div className="border-t border-line">
              {attendanceRows.map(({ attendance: a, person }) => (
                <div key={a.id} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><Avatar name={person.name} color={person.photoColor} size="xs" /><div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{person.name}</p><p className="text-caption text-muted">{person.role}</p></div><span className="text-caption font-medium text-mint-600">{formatTime(a.checkInAt)}</span></div>
              ))}
              {!attendanceRows.length ? <p className="px-4 py-5 text-center text-caption text-muted">No staff checked in yet.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Emergency readiness" icon={<ShieldAlert className="size-4" />} />
            <div className="border-t border-line p-4">
              <div className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5"><div className="flex items-center gap-2"><Phone className="size-4 text-brand-600" /><span className="text-caption text-ink-soft">Gate direct line{gateContact ? ` · ${gateContact.name}` : ""}</span></div>{gateContact ? <a href={telHref(gateContact.phone)} className="text-caption font-semibold text-ink hover:text-brand-700">{gateContact.phone}</a> : <span className="text-caption text-muted">Not configured</span>}</div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5"><div className="flex items-center gap-2"><Siren className="size-4 text-[#c43d4d]" /><span className="text-caption text-ink-soft">Emergency contacts</span></div><Link href="/admin/settings" className="text-caption font-semibold text-brand-600">Manage team</Link></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
