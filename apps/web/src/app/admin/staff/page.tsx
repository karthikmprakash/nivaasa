import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { BadgeCheck, CheckCircle2, Clock3, IndianRupee, ShieldCheck, Star, UserCheck, UserX, UsersRound } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AddStaffDialog } from "@/components/admin/staff-dialog";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { staff, staffAttendance, units } from "@/db/schema";
import { markStaffAttendance, toggleStaffActive, toggleStaffVerification } from "@/lib/actions/admin";
import { formatDate, formatINR, formatTime, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const { kind = "all" } = await searchParams;
  const today = todayISO();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const [staffRows, attendanceRows, weekRows, unitRows] = await Promise.all([
    db.select().from(staff).where(eq(staff.societyId, societyId)).orderBy(staff.kind, staff.name),
    db.select({ attendance: staffAttendance, person: staff }).from(staffAttendance).innerJoin(staff, eq(staffAttendance.staffId, staff.id)).where(and(eq(staffAttendance.societyId, societyId), eq(staffAttendance.date, today))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.societyId, societyId), gte(staffAttendance.checkInAt, weekAgo))),
    db.select({ id: units.id, number: units.number }).from(units).where(eq(units.societyId, societyId)),
  ]);
  const filtered = kind === "all" ? staffRows : staffRows.filter((s) => s.kind === kind);
  const activeStaff = staffRows.filter((s) => s.active);
  const presentIds = new Set(attendanceRows.map((a) => a.person.id));
  const monthlyPayroll = activeStaff.reduce((s, x) => s + (x.monthlyRate ?? 0), 0);
  const pendingVerification = activeStaff.filter((s) => !s.policeVerified);
  const attendanceBy = new Map(attendanceRows.map((a) => [a.person.id, a.attendance]));
  const attendanceRate = activeStaff.length ? Math.round((weekRows.length / (activeStaff.length * 7)) * 100) : 0;
  return (
    <div>
      <PageHeader eyebrow="People operations" title="Staff & attendance" description="Society staff, security and daily help — verified, present and paid on time." actions={<AddStaffDialog />} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Team size" value={activeStaff.length} hint={`${staffRows.filter((s) => s.kind === "daily_help").length} daily help`} tone="blue" icon={<UsersRound className="size-4" />} />
        <Stat label="Present today" value={presentIds.size} hint={`${activeStaff.length ? Math.round((presentIds.size / activeStaff.length) * 100) : 0}% of team`} tone="green" icon={<UserCheck className="size-4" />} />
        <Stat label="Weekly attendance" value={`${attendanceRate}%`} hint="Check-ins last 7 days" icon={<Clock3 className="size-4" />} />
        <Stat label="Monthly payroll" value={formatINR(monthlyPayroll)} hint={`${pendingVerification.length} IDs to verify`} tone="pink" icon={<IndianRupee className="size-4" />} />
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">{["all", "security", "society", "daily_help"].map((k) => <Link key={k} href={`/admin/staff?kind=${k}`} className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold capitalize ${kind === k ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft"}`}>{k.replace("_", " ")}</Link>)}</div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filtered.map((s) => {
              const a = attendanceBy.get(s.id);
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start gap-2.5">
                    <Avatar name={s.name} color={s.photoColor} size="md" />
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1"><p className="text-[11.5px] font-semibold text-ink">{s.name}</p>{s.policeVerified ? <BadgeCheck className="size-3 text-mint-600" /> : null}</div><p className="text-[9px] text-muted">{s.role} · {s.kind === "daily_help" ? `Home ${unitRows.find((u) => u.id === s.unitId)?.number ?? "—"}` : s.kind}</p><div className="mt-0.5 flex items-center gap-1 text-[8.5px] text-amber-ink"><Star className="size-2.5 fill-current" /> {s.rating?.toFixed(1)} <span className="text-muted">· {s.shift ?? "Flexible"}</span></div></div>
                    <Badge variant={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                    <span className={`text-[8.5px] font-medium ${a ? "text-mint-600" : "text-muted"}`}>{a ? <><CheckCircle2 className="mr-1 inline size-2.5" />In {formatTime(a.checkInAt)}{a.checkOutAt ? ` · Out ${formatTime(a.checkOutAt)}` : ""}</> : "Not checked in"}</span>
                    <div className="flex items-center gap-1.5">
                      {s.active ? <form action={markStaffAttendance}><input type="hidden" name="staffId" value={s.id} /><button className="rounded-full bg-brand-50 px-2 py-1 text-[8px] font-semibold text-brand-700">{a ? "Check out" : "Mark present"}</button></form> : null}
                      <form action={toggleStaffVerification}><input type="hidden" name="id" value={s.id} /><button className="rounded-full bg-canvas px-2 py-1 text-[8px] font-semibold text-ink-soft">{s.policeVerified ? "Verified" : "Verify ID"}</button></form>
                      <form action={toggleStaffActive}><input type="hidden" name="id" value={s.id} /><button className="rounded-full bg-canvas px-1.5 py-1 text-[8px] text-muted">{s.active ? <UserX className="size-2.5" /> : <UserCheck className="size-2.5" />}</button></form>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {!filtered.length ? <Card><EmptyState icon={<UsersRound className="size-6" />} title="No staff in this group" /></Card> : null}

          <Card>
            <CardHeader title="Attendance today" description={formatDate(new Date())} icon={<Clock3 className="size-4" />} />
            <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[520px]"><thead><tr className="bg-[#fbfcff]">{["Staff", "Role", "Check-in", "Check-out", "Method"].map((h) => <th key={h} className="border-b border-line px-4 py-2 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{attendanceRows.map(({ attendance: a, person }) => <tr key={a.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><div className="flex items-center gap-2"><Avatar name={person.name} color={person.photoColor} size="xs" /><span className="text-[9.5px] font-medium text-ink">{person.name}</span></div></td><td className="px-4 py-2.5 text-[8.5px] text-muted">{person.role}</td><td className="px-4 py-2.5 text-[8.5px] text-ink">{formatTime(a.checkInAt)}</td><td className="px-4 py-2.5 text-[8.5px] text-ink">{a.checkOutAt ? formatTime(a.checkOutAt) : "—"}</td><td className="px-4 py-2.5 text-[8px] capitalize text-muted">{a.method}</td></tr>)}</tbody></table></div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Verification queue" description={`${pendingVerification.length} profiles need ID review`} icon={<ShieldCheck className="size-4" />} />
            <div className="border-t border-line">{pendingVerification.map((s) => <div key={s.id} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><Avatar name={s.name} color={s.photoColor} size="xs" /><div className="min-w-0 flex-1"><p className="truncate text-[9.5px] font-semibold text-ink">{s.name}</p><p className="text-[8px] text-muted">{s.role} · {s.idType ?? "ID"} {s.idLast4 ? `••${s.idLast4}` : ""}</p></div><form action={toggleStaffVerification}><input type="hidden" name="id" value={s.id} /><button className="rounded-full bg-mint-50 px-2 py-1 text-[7.5px] font-bold text-mint-600">Verify</button></form></div>)}{!pendingVerification.length ? <p className="px-4 py-6 text-center text-[9px] text-muted">Everyone is verified.</p> : null}</div>
          </Card>
          <Card>
            <CardHeader title="Payroll overview" description="Monthly cost by team" icon={<IndianRupee className="size-4" />} />
            <div className="border-t border-line px-4 py-3">{["security", "society", "daily_help"].map((k) => { const total = activeStaff.filter((s) => s.kind === k).reduce((sum, s) => sum + (s.monthlyRate ?? 0), 0); return <div key={k} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-[9.5px] capitalize text-ink-soft">{k.replace("_", " ")}</span><span className="text-[10px] font-semibold text-ink">{formatINR(total)}</span></div>; })}<div className="mt-2 flex items-center justify-between"><span className="text-[10px] font-semibold text-ink">Total</span><span className="text-[12px] font-semibold text-ink">{formatINR(monthlyPayroll)}</span></div></div>
          </Card>
          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4"><p className="text-[10.5px] font-semibold text-ink">Statutory & compliance</p><p className="mt-1 text-[9px] leading-relaxed text-muted">ID verification, police checks and employment records live with each profile. Export payroll data for your accountant or auditor.</p><Link href="/admin/reports" className="mt-2 inline-flex text-[9px] font-semibold text-brand-600">Open reports →</Link></div>
        </aside>
      </div>
    </div>
  );
}
