import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ArrowDownToLine, ArrowRight, Building2, ChevronRight, Home, MoveRight, Search, UserPlus, Users, Wallet, XCircle } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AddResidentDialog } from "@/components/admin/add-resident-dialog";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { invoices, memberships, moveRequests, towers, units, users } from "@/db/schema";
import { handleMoveRequest } from "@/lib/actions/admin";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminResidentsPage({ searchParams }: { searchParams: Promise<{ q?: string; tower?: string; status?: string }> }) {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const params = await searchParams;
  const q = (params.q ?? "").toLowerCase();
  const towerFilter = params.tower ?? "all";
  const statusFilter = params.status ?? "all";
  const [unitRows, towerRows, memberRows, dueRows, moves] = await Promise.all([
    db.select({ unit: units, tower: towers }).from(units).innerJoin(towers, eq(units.towerId, towers.id)).where(eq(units.societyId, societyId)).orderBy(units.number),
    db.select().from(towers).where(eq(towers.societyId, societyId)).orderBy(towers.sortOrder),
    db.select({ membership: memberships, user: users }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(and(eq(memberships.societyId, societyId), inArray(memberships.role, ["owner", "tenant", "committee"]), eq(memberships.status, "active"))),
    db.select({ unitId: invoices.unitId, total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}),0)` }).from(invoices).where(and(eq(invoices.societyId, societyId), inArray(invoices.status, ["due", "overdue", "partially_paid"]))).groupBy(invoices.unitId),
    db.select({ request: moveRequests, unit: units.number, user: users.name, userId: users.id }).from(moveRequests).innerJoin(units, eq(moveRequests.unitId, units.id)).innerJoin(users, eq(moveRequests.userId, users.id)).where(and(eq(moveRequests.societyId, societyId), eq(moveRequests.status, "pending"))).orderBy(desc(moveRequests.createdAt)),
  ]);
  const memberByUnit = new Map(memberRows.map((m) => [m.membership.unitId!, m]));
  const duesByUnit = new Map(dueRows.map((d) => [d.unitId, d.total]));
  const vacant = unitRows.filter((u) => !memberByUnit.has(u.unit.id));
  const filtered = unitRows.filter(({ unit, tower }) => {
    const resident = memberByUnit.get(unit.id);
    if (towerFilter !== "all" && tower.id !== towerFilter) return false;
    if (statusFilter === "vacant" && resident) return false;
    if (statusFilter === "occupied" && !resident) return false;
    if (!q) return true;
    return unit.number.toLowerCase().includes(q) || (resident?.user.name.toLowerCase().includes(q) ?? false) || (resident?.user.email.toLowerCase().includes(q) ?? false);
  });
  const occupied = unitRows.length - vacant.length;
  const canAdd = ["admin", "manager", "committee"].includes(ctx.membership?.role ?? "");

  return (
    <div>
      <PageHeader eyebrow="Community" title="Residents & homes" description="Every home, every resident and every move — with the financial context that matters." actions={<>
        {canAdd ? <AddResidentDialog units={vacant.map((v) => ({ id: v.unit.id, number: v.unit.number }))} /> : null}
        <a href="/api/admin/export?type=residents" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-white px-3.5 text-[11px] font-semibold text-ink-soft hover:bg-canvas"><ArrowDownToLine className="size-3.5" /> Export</a>
      </>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Homes" value={unitRows.length} hint={`${towerRows.length} towers`} tone="blue" icon={<Building2 className="size-4" />} />
        <Stat label="Occupied" value={occupied} hint={`${Math.round((occupied / Math.max(1, unitRows.length)) * 100)}% occupancy`} tone="green" icon={<Home className="size-4" />} />
        <Stat label="Vacant" value={vacant.length} hint="Ready for onboarding" tone="pink" icon={<Users className="size-4" />} />
        <Stat label="Move requests" value={moves.length} hint={moves.length ? "Awaiting approval" : "All handled"} icon={<MoveRight className="size-4" />} />
      </div>

      {moves.length ? (
        <Card className="mt-4">
          <CardHeader title="Move requests" description="Coordinate lifts, movers and gate passes" icon={<MoveRight className="size-4" />} action={<Badge variant="warning">{moves.length} pending</Badge>} />
          <div className="border-t border-line">
            {moves.map((m) => (
              <div key={m.request.id} className="flex flex-col gap-2 border-b border-line/70 px-5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-soft text-amber-ink"><MoveRight className="size-3.5" /></span><div><p className="text-[11px] font-semibold capitalize text-ink">{m.request.type.replace("_", " ")} · Home {m.unit} · {m.user}</p><p className="text-[9.5px] text-muted">{formatDate(m.request.date)} · {m.request.notes ?? "No notes"}</p></div></div>
                <div className="flex items-center gap-2"><form action={handleMoveRequest}><input type="hidden" name="id" value={m.request.id} /><input type="hidden" name="decision" value="reject" /><button className="rounded-full border border-line px-2.5 py-1.5 text-[9px] font-semibold text-ink-soft">Reject</button></form><form action={handleMoveRequest}><input type="hidden" name="id" value={m.request.id} /><input type="hidden" name="decision" value="approve" /><button className="rounded-full bg-mint-600 px-2.5 py-1.5 text-[9px] font-semibold text-white">Approve</button></form></div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">{[{ v: "all", l: "All homes" }, { v: "occupied", l: "Occupied" }, { v: "vacant", l: "Vacant" }].map((f) => <Link key={f.v} href={`/admin/residents?status=${f.v}`} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${statusFilter === f.v ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>{f.l}</Link>)}{towerRows.map((t) => <Link key={t.id} href={`/admin/residents?tower=${t.id}`} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${towerFilter === t.id ? "bg-brand-600 text-white" : "bg-canvas text-ink-soft"}`}>Tower {t.code}</Link>)}</div>
          <form action="/admin/residents" className="flex h-8 items-center gap-2 rounded-full border border-line bg-white px-3 sm:w-60"><Search className="size-3 text-muted" /><input name="q" defaultValue={params.q} placeholder="Search home or resident…" className="w-full bg-transparent text-[10px] outline-none placeholder:text-muted" /></form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="bg-[#fbfcff]">{["Home", "Resident", "Role", "Type / area", "Outstanding", "Status", ""].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(({ unit, tower }) => {
                const resident = memberByUnit.get(unit.id);
                const dues = duesByUnit.get(unit.id) ?? 0;
                return (
                  <tr key={unit.id} className="group border-b border-line/70 last:border-0 hover:bg-[#fbfcff]">
                    <td className="px-4 py-3"><Link href={`/admin/residents/${unit.id}`} className="text-[11px] font-semibold text-ink group-hover:text-brand-700">{unit.number}</Link><p className="text-[8.5px] text-muted">{tower.name} · Floor {unit.floor}</p></td>
                    <td className="px-4 py-3">{resident ? <div className="flex items-center gap-2"><Avatar name={resident.user.name} color={resident.user.avatarColor} size="xs" /><div><p className="text-[10px] font-semibold text-ink">{resident.user.name}</p><p className="text-[8px] text-muted">{resident.user.phone}</p></div></div> : <span className="text-[9px] text-muted">Vacant</span>}</td>
                    <td className="px-4 py-3">{resident ? <Badge variant={resident.membership.role === "tenant" ? "outline" : "blue"}>{resident.membership.role === "committee" ? "Committee" : resident.membership.role}</Badge> : <span className="text-[9px] text-muted">—</span>}</td>
                    <td className="px-4 py-3"><p className="text-[9.5px] text-ink-soft">{unit.unitType}</p><p className="text-[8px] text-muted">{unit.areaSqft} sq ft</p></td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold ${dues ? "text-[#c43d4d]" : "text-mint-600"}`}>{dues ? formatINR(dues) : "Clear"}</span></td>
                    <td className="px-4 py-3"><Badge variant={resident ? "success" : "neutral"}>{resident ? "Occupied" : "Vacant"}</Badge></td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/residents/${unit.id}`} className="inline-flex size-6 items-center justify-center rounded-full text-muted hover:bg-brand-50 hover:text-brand-600"><ChevronRight className="size-3.5" /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length ? <EmptyState icon={<Building2 className="size-6" />} title="No homes match" description="Try adjusting the search or filters." /> : null}
        </div>
      </Card>
    </div>
  );
}
