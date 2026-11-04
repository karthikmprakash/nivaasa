import { QueryTabs } from "@/components/ui/query-tabs";
import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import {
  ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock3, KeyRound, ShieldCheck,
  UserRoundPlus, Users, XCircle, Package, RefreshCcw, History,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { CopyCode } from "@/components/app/copy-code";
import { VisitorApprovalCard } from "@/components/app/visitor-approval-card";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { staff, staffAttendance, visitors } from "@/db/schema";
import { cancelPreApproval } from "@/lib/actions/visitors";
import { communityMonthKey } from "@/lib/datetime";
import { formatDate, formatTime, timeAgo, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Visitors" };

export const dynamic = "force-dynamic";

const tabs = [
  { value: "pending", label: "Waiting" },
  { value: "upcoming", label: "Pre-approved" },
  { value: "history", label: "History" },
];

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ tab?: string; created?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const tab = params.tab ?? "pending";
  const now = new Date();
  const all = await db.select().from(visitors).where(and(eq(visitors.unitId, ctx.unit.id), eq(visitors.societyId, ctx.society.id))).orderBy(desc(visitors.createdAt));
  const pending = all.filter((v) => v.status === "pending");
  const upcoming = all.filter((v) => v.preApproved && ["approved", "pending"].includes(v.status) && (!v.validTo || v.validTo >= now));
  const created = upcoming.find((pass) => pass.id === params.created);
  const history = all.filter((v) => ["entered", "exited", "denied", "expired"].includes(v.status) || (v.validTo && v.validTo < now));
  const entriesThisMonth = all.filter((v) => v.enteredAt && communityMonthKey(v.enteredAt) === communityMonthKey(now)).length;
  const dailyHelp = await db.select({ attendance: staffAttendance, person: staff }).from(staffAttendance).innerJoin(staff, eq(staffAttendance.staffId, staff.id)).where(and(eq(staffAttendance.unitId, ctx.unit.id), eq(staffAttendance.date, todayISO()), eq(staff.kind, "daily_help"), eq(staff.active, true)));

  return (
    <div>
      <PageHeader
        eyebrow="Gate & security"
        title="Visitors"
        description="Approve people at the gate, create passes for expected guests, and see every entry linked to your home."
        actions={<Link href="/app/visitors/new" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"><UserRoundPlus aria-hidden="true" className="size-4" /> <span>Pre-approve</span></Link>}
      />

      {created?.code ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-blush-50 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-mint-600" />
            <div>
              <p className="break-words text-section font-semibold text-ink">{created.recurringCab ? "Daily cab pass ready" : `Pass ready for ${created.name}`}</p>
              <p className="mt-1 text-caption text-ink-soft">{created.recurringCab ? "Share this code for one pickup each day in your date range." : "Share this code with your visitor for one entry."}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-xl font-bold tracking-[0.15em] text-brand-700">{created.code}</p>
            <CopyCode code={created.code} label="Entry code" />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Waiting at gate" value={pending.length} hint={pending.length ? "Needs your response" : "All clear"} tone="pink" icon={<Clock3 className="size-4" />} />
        <Stat label="Active passes" value={upcoming.length} hint="Pre-approved visitors" tone="blue" icon={<KeyRound className="size-4" />} />
        <Stat label="Entries this month" value={entriesThisMonth} hint="Linked to your home" icon={<ShieldCheck className="size-4" />} />
        <Stat label="Daily help today" value={dailyHelp.length} hint={dailyHelp.map((d) => d.person.name.split(" ")[0]).join(", ") || "No arrivals yet"} tone="green" icon={<Users className="size-4" />} />
      </div>

      <QueryTabs className="mt-5" label="Visitor views" basePath="/app/visitors" value={tab} items={tabs.map((t) => ({ ...t, count: t.value === "pending" ? pending.length : t.value === "upcoming" ? upcoming.length : history.length }))} />

      {tab === "pending" ? (
        pending.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {pending.map((v) => <VisitorApprovalCard key={v.id} visitor={v} />)}
          </div>
        ) : (
          <Card className="mt-4"><EmptyState icon={<ShieldCheck className="size-6" />} title="The gate is quiet" description="Nobody is waiting for your approval right now. We'll notify you the moment someone arrives." action={<Link href="/app/visitors/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-caption font-semibold text-white">Pre-approve a visitor <ArrowRight className="size-4" /></Link>} /></Card>
        )
      ) : null}

      {tab === "upcoming" ? (
        upcoming.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcoming.map((v) => (
              <div key={v.id} className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(19,26,42,0.03)]">
                <div className="absolute inset-y-0 left-0 w-[3px] bg-brand-500" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={v.name} color={v.photoColor} size="md" />
                    <div><p className="text-body font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ? `${v.company} · ` : ""}{v.purpose ?? v.type.replace("_", " ")}</p></div>
                  </div>
                  <Badge variant={v.leaveAtGate ? "warning" : "success"}>{v.recurringCab ? "Daily pickup" : v.leaveAtGate ? "Leave at gate" : "Pre-approved"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2">
                  <KeyRound className="size-4 text-brand-600" />
                  <div className="flex-1"><p className="text-caption font-semibold uppercase tracking-wide text-muted">Entry code</p><p className="font-mono text-base font-bold tracking-[0.18em] text-ink">{v.code}</p></div>
                  <div className="text-right"><p className="text-caption font-semibold uppercase tracking-wide text-muted">Valid</p><p className="text-caption font-semibold text-ink">{formatDate(v.validFrom) === formatDate(v.validTo) ? formatDate(v.validFrom) : `${formatDate(v.validFrom)} – ${formatDate(v.validTo)}`}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {v.code ? <CopyCode code={v.code} label="Entry code" /> : <p className="text-caption text-muted">Created {timeAgo(v.createdAt)}</p>}
                  <form action={cancelPreApproval}><input type="hidden" name="visitorId" value={v.id} /><button className="rounded-lg px-2.5 py-1.5 text-caption font-semibold text-[#c43d4d] hover:bg-[#fdeced]">Cancel pass</button></form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="mt-4"><EmptyState icon={<KeyRound className="size-6" />} title="No active passes" description="Pre-approve a guest or regular visitor and they can walk straight in with their code." action={<Link href="/app/visitors/new" className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-caption font-semibold text-white">Create a pass</Link>} /></Card>
        )
      ) : null}

      {tab === "history" ? (
        <Card className="mt-4 overflow-hidden">
          {history.length ? (
            <div>
              {history.map((v) => (
                <div key={v.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:px-5">
                  <Avatar name={v.name} color={v.photoColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-ink">{v.name}</p>
                    <p className="text-caption text-muted">{v.company ? `${v.company} · ` : ""}{v.type.replace("_", " ")} · {formatDate(v.createdAt)} {v.enteredAt ? `· in ${formatTime(v.enteredAt)}` : ""}{v.exitedAt ? ` · out ${formatTime(v.exitedAt)}` : ""}</p>
                  </div>
                  {v.status === "denied" ? <Badge variant="danger">Denied</Badge> : v.status === "expired" || (v.status === "approved" && v.validTo && v.validTo < now) ? <Badge variant="neutral">Expired</Badge> : v.status === "exited" && v.leaveAtGate && !v.enteredAt ? <Badge variant="warning">Left at gate</Badge> : v.status === "entered" ? <Badge variant="pink">Inside</Badge> : <Badge variant="success">Exited</Badge>}
                </div>
              ))}
            </div>
          ) : <EmptyState icon={<History className="size-6" />} title="No visitor history yet" description="Once visitors enter or exit, the full log will appear here." />}
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Users className="size-4" /></span>
            <div className="flex-1"><p className="text-body font-semibold text-ink">Daily help attendance</p><p className="mt-0.5 text-caption text-muted">Today&apos;s check-ins for your household staff</p></div>
            <Link href="/app/my-home#help" className="text-caption font-semibold text-brand-600">Manage</Link>
          </div>
          <div className="border-t border-line">
            {dailyHelp.length ? dailyHelp.map((d) => (
              <div key={d.attendance.id} className="flex items-center gap-2.5 border-b border-line/60 px-5 py-2.5 last:border-0">
                <Avatar name={d.person.name} color={d.person.photoColor} size="sm" />
                <div className="flex-1"><p className="text-caption font-semibold text-ink">{d.person.name}</p><p className="text-caption text-muted">{d.person.role}</p></div>
                <span className="text-caption font-medium text-mint-600">{d.attendance.checkOutAt ? `Left at ${formatTime(d.attendance.checkOutAt)}` : `In at ${formatTime(d.attendance.checkInAt)}`}</span>
              </div>
            )) : <p className="px-5 py-5 text-caption text-muted">No one has checked in yet today.</p>}
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-[#fbfcff] to-white">
          <div className="p-5">
            <div className="flex items-center gap-2"><RefreshCcw className="size-4 text-brand-600" /><p className="text-body font-semibold text-ink">Daily cab pickup</p></div>
            <p className="mt-1 text-caption leading-relaxed text-muted">Set a date range for a regular pickup. The same code works once per day until the pass ends.</p>
            <Link href="/app/visitors/new?type=cab&mode=daily" className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-brand-600">Set up daily pickup <ChevronRight className="size-4" /></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
