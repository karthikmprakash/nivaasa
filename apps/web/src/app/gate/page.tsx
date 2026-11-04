import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  AlertTriangle, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, DoorOpen, KeyRound,
  LogOut, MapPin, Package, Phone, Search, ShieldAlert, ShieldCheck, UserRoundCheck, Users, Wifi,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/primitives";
import { GateEntryWizard, GateQueue, GateStaff, GatePatrol, GateDeliveries, GatePanic, GateExitButton } from "@/components/gate/gate-panels";
import { SocietySwitcher } from "@/components/shell/society-switcher";
import { getSocietyOptions, requireGuard } from "@/lib/queries";
import { db } from "@/db";
import { deliveries, patrolCheckpoints, patrolRounds, staff, staffAttendance, units, users, visitors, panicAlerts, helpdeskTickets, notifications } from "@/db/schema";
import { logoutAction } from "@/lib/actions/auth";
import { passDateBoundary, shiftPassDate } from "@/lib/visitor-pass-rules";
import { formatDate, formatTime, timeAgo, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Gate console" };
export const dynamic = "force-dynamic";

export default async function GatePage() {
  const ctx = await requireGuard();
  const society = ctx.society!;
  const societies = await getSocietyOptions(ctx);
  const today = todayISO();
  const start = passDateBoundary(today);
  const tomorrow = passDateBoundary(shiftPassDate(today, 1));
  const [queueRows, deliveriesRows, staffRows, attendanceRows, checkpoints, rounds, recentRows, alerts, ticketRows, unreadRows, preApproved] = await Promise.all([
    db.select({ v: visitors, unit: units.number, hostName: users.name, hostPhone: users.phone }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).leftJoin(users, eq(visitors.hostUserId, users.id)).where(and(eq(visitors.societyId, society.id), eq(visitors.preApproved, false), eq(visitors.leaveAtGate, false), inArray(visitors.status, ["pending", "approved"]), gte(visitors.createdAt, new Date(Date.now() - 24 * 3600 * 1000)))).orderBy(desc(visitors.createdAt)).limit(30),
    db.select({ delivery: deliveries, unit: units.number }).from(deliveries).leftJoin(units, eq(deliveries.unitId, units.id)).where(and(eq(deliveries.societyId, society.id), inArray(deliveries.status, ["arrived", "left_at_gate"]))).orderBy(desc(deliveries.createdAt)),
    db.select({ person: staff, unit: units.number }).from(staff).leftJoin(units, eq(staff.unitId, units.id)).where(and(eq(staff.societyId, society.id), eq(staff.active, true))).orderBy(staff.kind, staff.name),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.societyId, society.id), eq(staffAttendance.date, today))),
    db.select().from(patrolCheckpoints).where(eq(patrolCheckpoints.societyId, society.id)).orderBy(patrolCheckpoints.sortOrder),
    db.select().from(patrolRounds).where(and(eq(patrolRounds.societyId, society.id), gte(patrolRounds.scannedAt, new Date(today)))),
    db.select({ v: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(eq(visitors.societyId, society.id)).orderBy(desc(visitors.createdAt)).limit(12),
    db.select({ alert: panicAlerts, unit: units.number, user: users.name }).from(panicAlerts).leftJoin(units, eq(panicAlerts.unitId, units.id)).leftJoin(users, eq(panicAlerts.userId, users.id)).where(and(eq(panicAlerts.societyId, society.id), inArray(panicAlerts.status, ["open", "acknowledged"]))).orderBy(desc(panicAlerts.createdAt)),
    db.select({ count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, society.id), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))),
    db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, ctx.user.id), eq(notifications.societyId, society.id), isNull(notifications.readAt))),
    db.select({ v: visitors, unit: units.number }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(and(eq(visitors.societyId, society.id), eq(visitors.preApproved, true), eq(visitors.status, "approved"), or(isNull(visitors.validFrom), lt(visitors.validFrom, tomorrow)), or(isNull(visitors.validTo), gte(visitors.validTo, new Date())))).orderBy(visitors.validFrom).limit(20),
  ]);
  const attendanceBy = new Map(attendanceRows.map((a) => [a.staffId, a]));
  const queue = queueRows.map((r) => ({ ...r.v, unit: r.unit, hostName: r.hostName, hostPhone: r.hostPhone }));
  const pendingQueue = queue.filter((q) => q.status === "pending").length;

  const entriesToday = recentRows.filter((r) => r.v.enteredAt && r.v.enteredAt >= start);
  const staffPresent = attendanceRows.filter((a) => a.checkInAt && !a.checkOutAt).length;
  const patrolDone = new Set(rounds.filter((r) => r.status === "scanned").map((r) => r.checkpointId)).size;
  const staffForPanel = staffRows.map((s) => ({ id: s.person.id, name: s.person.name, role: s.person.role, kind: s.person.kind, photoColor: s.person.photoColor, unit: s.unit, policeVerified: s.person.policeVerified }));
  const attendanceMap: Record<string, { in: boolean; out: boolean }> = {};
  for (const a of attendanceRows) attendanceMap[a.staffId] = { in: !!a.checkInAt, out: !!a.checkOutAt };
  const firstName = ctx.user.name.split(" ")[0];

  return (
    <div data-guard-console className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/gate"><Logo size={30} /></Link>
            <span className="hidden h-6 w-px bg-line sm:block" />
            <div className="hidden min-w-0 sm:block"><p className="text-caption font-semibold text-ink">Gate 1 · Main entrance</p><SocietySwitcher societies={societies} currentId={society.id} variant="header" /></div>
          </div>
          <nav className="no-scrollbar hidden items-center gap-1 overflow-x-auto md:flex">
            {[["Entry", "#entry"], ["Queue", "#queue"], ["Staff", "#staff"], ["Patrol", "#patrol"], ["Alerts", "#alerts"]].map(([l, h]) => <a key={l} href={h} className="rounded-full px-3 py-1.5 text-caption font-semibold text-ink-soft hover:bg-canvas">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            {ctx.user.globalRole === "super_admin" || ctx.membership?.role === "admin" ? <Link href="/admin/security" className="hidden rounded-full border border-line px-2.5 py-1.5 text-caption font-semibold text-ink-soft sm:inline">Exit preview</Link> : null}
            <span className="hidden items-center gap-1 rounded-full border border-mint-600/20 bg-mint-50 px-2.5 py-1.5 text-caption font-bold text-mint-600 sm:flex"><span className="size-1.5 animate-pulse rounded-full bg-mint-600" /> On duty</span>
            <Link href="/gate#alerts" aria-label="View safety alerts" className="relative grid size-8 place-items-center rounded-full text-ink-soft hover:bg-canvas"><Bell className="size-4" />{alerts.length ? <span className="absolute right-1 top-1 size-2 rounded-full bg-[#d94a5a] ring-2 ring-white" /> : null}</Link>
            <div className="flex items-center gap-1.5"><Avatar name={ctx.user.name} color={ctx.user.avatarColor} size="sm" /><div className="hidden sm:block"><p className="text-caption font-semibold text-ink">{ctx.user.name}</p><p className="text-caption text-muted">Head Security</p></div></div>
            <form action={logoutAction}><button aria-label="Sign out" className="grid size-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-[#c43d4d]"><LogOut className="size-4" /></button></form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 pb-10 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-caption font-medium text-muted"><span className="size-1.5 rounded-full bg-mint-600" /> {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Gate operations</p>
            <h1 className="mt-1 text-title font-semibold leading-tight text-ink sm:text-[30px]">Namaste, {firstName}.</h1>
            <p className="mt-1.5 text-caption text-ink-soft">A calm gate is a safe gate. Log every entry, verify every pass.</p>
          </div>
          <div className="flex items-center gap-2"><Link href="/gate#entry" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-caption font-semibold text-white shadow-[0_8px_20px_-10px_rgba(49,85,216,0.6)]"><DoorOpen className="size-4" /> New entry</Link><Link href="/gate#alerts" className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-caption font-semibold ${alerts.length ? "border-[#f0c7cc] bg-[#fdf1f3] text-[#c43d4d]" : "border-line bg-white text-ink-soft"}`}><ShieldAlert className="size-4" /> {alerts.length ? `${alerts.length} alert${alerts.length > 1 ? "s" : ""}` : "Emergency"}</Link></div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { l: "Waiting approval", v: queue.filter((q) => q.status === "pending").length, i: Clock3, tone: "text-amber-ink bg-amber-soft" },
            { l: "Pre-approved", v: preApproved.length, i: KeyRound, tone: "text-mint-600 bg-mint-50" },
            { l: "Deliveries", v: deliveriesRows.length, i: Package, tone: "text-blush-600 bg-blush-50" },
            { l: "Staff present", v: `${staffPresent}/${staffRows.length}`, i: Users, tone: "text-brand-600 bg-brand-50" },
            { l: "Patrol done", v: `${patrolDone}/${checkpoints.length}`, i: MapPin, tone: "text-[#6a54c8] bg-[#f2effc]" },
          ].map((s) => <div key={s.l} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-3 last:col-span-2 sm:last:col-span-1"><p className="text-caption font-medium text-muted">{s.l}</p><p className="shrink-0 text-lg font-semibold tabular-nums text-ink">{s.v}</p></div>)}
        </div>

        {alerts.length ? <div id="alerts" className="mt-4 flex items-center gap-2 rounded-xl border border-[#f0c7cc] bg-[#fdf1f3] px-3 py-2 text-caption font-semibold text-[#a82f3e]"><AlertTriangle className="size-4" /> {alerts.length} active panic alert{alerts.length > 1 ? "s" : ""} — respond immediately. <a href="#alerts-panel" className="ml-auto underline">View</a></div> : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="min-w-0 space-y-4">
            <Card id="entry" className="scroll-mt-20">
              <CardHeader title="Log a visitor" description="Search the resident, add the visitor and log the entry" icon={<DoorOpen className="size-4" />} action={<span className="rounded-full bg-brand-50 px-2 py-1 text-caption font-semibold text-brand-700">Gate 1</span>} />
              <div className="border-t border-line p-4 sm:p-5"><GateEntryWizard /></div>
            </Card>

            <Card id="queue" className="scroll-mt-20">
              <CardHeader title="Waiting for approval" description="Resident approvals arrive here automatically" icon={<Clock3 className="size-4" />} action={<Badge variant={pendingQueue ? "warning" : "success"}>{pendingQueue ? `${pendingQueue} waiting` : "Clear"}</Badge>} />
              <div className="border-t border-line p-4"><GateQueue initial={queue} /></div>
            </Card>

            <Card id="deliveries" className="scroll-mt-20">
              <CardHeader title="Deliveries at the gate" description="Verify pickup codes before handing over" icon={<Package className="size-4" />} action={<Badge variant="pink">{deliveriesRows.length}</Badge>} />
              <div className="border-t border-line p-4"><GateDeliveries deliveries={deliveriesRows.map((d) => ({ id: d.delivery.id, company: d.delivery.company, courierName: d.delivery.courierName, unit: d.unit, status: d.delivery.status, otp: d.delivery.otp, createdAt: d.delivery.createdAt.toISOString() }))} /></div>
            </Card>

            <Card>
              <CardHeader title="Recent entries" description="Your shift's gate log" icon={<ShieldCheck className="size-4" />} action={<span className="text-caption text-muted">{entriesToday.length} in today</span>} />
              <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[560px]"><thead><tr className="bg-[#fbfcff]">{["Visitor", "Home", "Type", "In", "Status", ""].map((h) => <th key={h} className="border-b border-line px-3 py-2 text-left text-caption font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{recentRows.map(({ v, unit }) => <tr key={v.id} className="border-b border-line/70 last:border-0"><td className="px-3 py-2"><div className="flex items-center gap-1.5"><Avatar name={v.name} color={v.photoColor} size="xs" /><div><p className="text-caption font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ?? "—"}</p></div></div></td><td className="px-3 py-2 text-caption font-medium text-ink">{unit ?? "—"}</td><td className="px-3 py-2 text-caption capitalize text-muted">{v.type.replace("_", " ")}</td><td className="px-3 py-2 text-caption text-muted">{v.enteredAt ? formatTime(v.enteredAt) : "—"}</td><td className="px-3 py-2"><Badge variant={v.status === "entered" ? "pink" : v.status === "pending" ? "warning" : v.status === "approved" ? "blue" : "neutral"}>{v.status}</Badge></td><td className="px-3 py-2 text-right">{v.status === "entered" ? <GateExitButton id={v.id} /> : null}</td></tr>)}</tbody></table></div>
            </Card>
          </div>

          <aside className="min-w-0 space-y-4">
            <Card>
              <CardHeader title="Expected today" description="Pre-approved passes" icon={<KeyRound className="size-4" />} action={<Badge variant="success">{preApproved.length}</Badge>} />
              <div className="border-t border-line">
                {preApproved.map((r) => <div key={r.v.id} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><span className="grid size-7 place-items-center rounded-full bg-mint-50 text-caption font-bold text-mint-600">{r.v.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{r.v.name}</p><p className="text-caption text-muted">{r.v.company ?? r.v.type.replace("_", " ")} · Home {r.unit} · {r.v.validTo ? `till ${formatDate(r.v.validTo)}` : "today"}</p></div><span className="rounded-full bg-canvas px-1.5 py-0.5 font-mono text-caption font-bold tracking-wide text-ink-soft">••{r.v.code?.slice(-2)}</span></div>)}
                {!preApproved.length ? <p className="px-4 py-5 text-center text-caption text-muted">No pre-approved passes today.</p> : null}
              </div>
            </Card>

            <Card id="staff" className="scroll-mt-20">
              <CardHeader title="Daily help & staff" description="Mark check-in and check-out" icon={<Users className="size-4" />} action={<Badge variant="blue">{staffPresent} in</Badge>} />
              <div className="border-t border-line p-3"><GateStaff people={staffForPanel} attendance={attendanceMap} /></div>
            </Card>

            <Card id="patrol" className="scroll-mt-20">
              <CardHeader title="Patrol rounds" description="Scan each checkpoint as you go" icon={<MapPin className="size-4" />} action={<Badge variant={patrolDone === checkpoints.length ? "success" : "warning"}>{patrolDone}/{checkpoints.length}</Badge>} />
              <div className="border-t border-line p-3"><GatePatrol checkpoints={checkpoints} scannedIds={Array.from(new Set(rounds.filter((r) => r.status === "scanned").map((r) => r.checkpointId)))} /></div>
            </Card>

            <Card id="alerts-panel" className="scroll-mt-20">
              <CardHeader title="Emergency alerts" description="Panic alerts from residents" icon={<ShieldAlert className="size-4" />} action={alerts.length ? <Badge variant="danger" dot>{alerts.length} active</Badge> : <Badge variant="success">Clear</Badge>} />
              <div className="border-t border-line p-3"><GatePanic alerts={alerts.map((a) => ({ id: a.alert.id, message: a.alert.message, unit: a.unit, user: a.user, status: a.alert.status, createdAt: a.alert.createdAt.toISOString() }))} /></div>
            </Card>

            <div className="rounded-[18px] border border-line bg-white p-4">
              <div className="flex items-center gap-2"><Phone className="size-4 text-brand-600" /><p className="text-caption font-semibold text-ink">Quick contacts</p></div>
              <div className="mt-2 space-y-1.5"><a href="tel:+919845089012" className="flex items-center justify-between text-caption text-ink-soft"><span>Community manager</span><span className="font-semibold text-ink">Call</span></a><a href="tel:+919811188990" className="flex items-center justify-between text-caption text-ink-soft"><span>Security manager</span><span className="font-semibold text-ink">Call</span></a><a href="tel:112" className="flex items-center justify-between text-caption text-ink-soft"><span>Police / ambulance</span><span className="font-semibold text-[#c43d4d]">112</span></a></div>
            </div>
            <div className="rounded-[18px] bg-gradient-to-br from-brand-50 to-blush-50 p-4"><p className="flex items-center gap-1.5 text-caption font-semibold text-ink"><Wifi className="size-4 text-brand-600" /> Shift handover</p><p className="mt-1 text-caption leading-relaxed text-ink-soft">Evening shift starts at 2 PM. Note any pending approvals, deliveries or missed patrol checkpoints before handover.</p></div>
          </aside>
        </div>
      </main>
    </div>
  );
}
