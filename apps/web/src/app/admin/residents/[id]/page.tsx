import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Car, CheckCircle2, Dog, Home, MoveRight, PawPrint, Phone, ReceiptText, ShieldCheck, Users, Wallet, Wrench } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, Stat } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { familyMembers, helpdeskTickets, invoices, memberships, moveRequests, pets, staff, towers, units, users, vehicles, visitors } from "@/db/schema";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const [row] = await db.select({ unit: units, tower: towers }).from(units).innerJoin(towers, eq(units.towerId, towers.id)).where(and(eq(units.id, id), eq(units.societyId, ctx.society!.id))).limit(1);
  if (!row) notFound();
  const { unit, tower } = row;
  const [members, familyRows, invoiceRows, ticketRows, vehicleRows, petRows, helpRows, moveRows, visitorRows] = await Promise.all([
    db.select({ membership: memberships, user: users }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(eq(memberships.unitId, unit.id)),
    db.select({ family: familyMembers, membership: memberships }).from(familyMembers).innerJoin(memberships, eq(familyMembers.membershipId, memberships.id)).where(eq(memberships.unitId, unit.id)),
    db.select().from(invoices).where(eq(invoices.unitId, unit.id)).orderBy(desc(invoices.issueDate)).limit(8),
    db.select().from(helpdeskTickets).where(eq(helpdeskTickets.unitId, unit.id)).orderBy(desc(helpdeskTickets.createdAt)).limit(6),
    db.select().from(vehicles).where(eq(vehicles.unitId, unit.id)),
    db.select().from(pets).where(eq(pets.unitId, unit.id)),
    db.select().from(staff).where(and(eq(staff.unitId, unit.id), eq(staff.active, true))),
    db.select().from(moveRequests).where(eq(moveRequests.unitId, unit.id)).orderBy(desc(moveRequests.createdAt)).limit(3),
    db.select().from(visitors).where(eq(visitors.unitId, unit.id)).orderBy(desc(visitors.createdAt)).limit(6),
  ]);
  const dues = invoiceRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.status)).reduce((s, i) => s + i.total - i.amountPaid, 0);
  const primary = members.find((m) => m.membership.isPrimary) ?? members[0];

  return (
    <div>
      <Link href="/admin/residents" className="mb-4 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Residents & homes</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-600">{tower.name} Tower</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-ink">Home {unit.number}</h1><p className="mt-1 text-caption text-muted">{unit.unitType} · {unit.areaSqft} sq ft · Floor {unit.floor} · {unit.parkingSlots} parking</p></div>
        <div className="flex gap-2">{primary ? <a href={`tel:${primary.user.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-caption font-semibold text-ink-soft"><Phone className="size-4" /> Call resident</a> : null}<Link href="/admin/billing" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-caption font-semibold text-white"><Wallet className="size-4" /> Invoices</Link></div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Outstanding" value={dues ? formatINR(dues) : "Clear"} hint={dues ? "Balance due" : "No dues"} tone={dues ? "pink" : "green"} icon={<Wallet className="size-4" />} />
        <Stat label="Residents" value={members.length + familyRows.length} hint={`${members.length} app user${members.length === 1 ? "" : "s"}`} tone="blue" icon={<Users className="size-4" />} />
        <Stat label="Vehicles" value={vehicleRows.length} hint={`${petRows.length} pet${petRows.length === 1 ? "" : "s"}`} icon={<Car className="size-4" />} />
        <Stat label="Open tickets" value={ticketRows.filter((t) => !["resolved", "closed"].includes(t.status)).length} hint="Helpdesk requests" tone="green" icon={<Wrench className="size-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Residents & household" description="People linked to this home" icon={<Users className="size-4" />} />
            <div className="border-t border-line">
              {members.map(({ membership: m, user }) => (
                <div key={m.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0"><Avatar name={user.name} color={user.avatarColor} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-caption font-semibold text-ink">{user.name}</p><Badge variant={m.role === "tenant" ? "outline" : m.role === "committee" ? "pink" : "blue"}>{m.role === "committee" ? "Committee" : m.role}</Badge>{m.isPrimary ? <Badge variant="outline">Primary</Badge> : null}</div><p className="text-caption text-muted">{user.email} · {user.phone} · joined {formatDate(m.joinedAt)}</p></div><Badge variant={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge></div>
              ))}
              {familyRows.map(({ family: f }) => <div key={f.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-2.5 last:border-0"><Avatar name={f.name} color="#9aa7c2" size="sm" /><div className="flex-1"><p className="text-caption font-semibold text-ink">{f.name}</p><p className="text-caption text-muted">{f.relation}{f.age ? ` · ${f.age} yrs` : ""} {f.phone ? `· ${f.phone}` : ""}</p></div>{f.hasApp ? <Badge variant="success">App user</Badge> : null}</div>)}
              {!members.length ? <p className="px-5 py-6 text-center text-caption text-muted">This home is vacant.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent invoices" description="Billing history for this home" icon={<ReceiptText className="size-4" />} action={<Link href="/admin/billing" className="text-caption font-semibold text-brand-600">Billing</Link>} />
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[540px]"><thead><tr className="bg-[#fbfcff]">{["Invoice", "Due", "Total", "Status"].map((h) => <th key={h} className="border-b border-line px-4 py-2 text-left text-caption font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{invoiceRows.map((i) => <tr key={i.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-2.5"><p className="text-caption font-semibold text-ink">{i.title}</p><p className="text-caption text-muted">{i.number}</p></td><td className="px-4 py-2.5 text-caption text-muted">{formatDate(i.dueDate)}</td><td className="px-4 py-2.5 text-caption font-semibold text-ink">{formatINR(i.total)}</td><td className="px-4 py-2.5"><Badge variant={i.status === "paid" ? "success" : i.status === "overdue" ? "danger" : "warning"}>{i.status.replace("_", " ")}</Badge></td></tr>)}</tbody></table>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card><CardHeader title="Vehicles" icon={<Car className="size-4" />} /><div className="border-t border-line">{vehicleRows.map((v) => <div key={v.id} className="border-b border-line/70 px-4 py-2.5 last:border-0"><p className="text-caption font-semibold text-ink">{v.make} {v.model}</p><p className="text-caption text-muted">{v.registrationNo} · {v.parkingSlot}</p></div>)}</div></Card>
            <Card><CardHeader title="Pets" icon={<PawPrint className="size-4" />} /><div className="border-t border-line">{petRows.map((p) => <div key={p.id} className="border-b border-line/70 px-4 py-2.5 last:border-0"><p className="text-caption font-semibold text-ink">{p.name}</p><p className="text-caption text-muted">{p.breed ?? p.species} · {p.vaccinated ? "Vaccinated" : "Due"}</p></div>)}</div></Card>
          </div>

          <Card>
            <CardHeader title="Helpdesk requests" description="Issues raised from this home" icon={<Wrench className="size-4" />} action={<Link href="/admin/helpdesk" className="text-caption font-semibold text-brand-600">All</Link>} />
            <div className="border-t border-line">{ticketRows.map((t) => <Link key={t.id} href={`/admin/helpdesk/${t.id}`} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0 hover:bg-[#fbfcff]"><div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{t.subject}</p><p className="text-caption text-muted">{t.category} · {timeAgo(t.updatedAt)}</p></div><Badge variant={t.status === "resolved" || t.status === "closed" ? "success" : t.priority === "urgent" ? "danger" : "warning"}>{t.status.replace("_", " ")}</Badge></Link>)}</div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Home details" icon={<Home className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              {[["Tower", tower.name], ["Floor", String(unit.floor)], ["Type", unit.unitType], ["Area", `${unit.areaSqft} sq ft`], ["Parking", `${unit.parkingSlots} slots`], ["Ownership", unit.ownership.replace("_", " ")], ["Status", unit.status.replace("_", " ")], ["Intercom", unit.intercomPrimary ?? "Not set"], ["Emergency", unit.emergencyName ?? "Not set"]].map(([l, v]) => <div key={l} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="text-caption text-muted">{l}</span><span className="text-caption font-medium capitalize text-ink">{v}</span></div>)}
            </div>
          </Card>
          <Card><CardHeader title="Daily help" icon={<Users className="size-4" />} /><div className="border-t border-line">{helpRows.map((s) => <div key={s.id} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><Avatar name={s.name} color={s.photoColor} size="xs" /><div className="flex-1"><p className="text-caption font-semibold text-ink">{s.name}</p><p className="text-caption text-muted">{s.role} · {s.shift}</p></div>{s.policeVerified ? <ShieldCheck className="size-4 text-mint-600" /> : <Badge variant="warning">Pending</Badge>}</div>)}</div></Card>
          <Card><CardHeader title="Move requests" icon={<MoveRight className="size-4" />} /><div className="border-t border-line">{moveRows.map((m) => <div key={m.id} className="border-b border-line/70 px-4 py-2.5 last:border-0"><div className="flex items-center justify-between"><p className="text-caption font-semibold capitalize text-ink">{m.type.replace("_", " ")}</p><Badge variant={m.status === "approved" ? "success" : "warning"}>{m.status}</Badge></div><p className="text-caption text-muted">{formatDate(m.date)}</p></div>)}{!moveRows.length ? <p className="px-4 py-4 text-caption text-muted">No move requests.</p> : null}</div></Card>
          <Card><CardHeader title="Recent gate activity" icon={<ShieldCheck className="size-4" />} /><div className="border-t border-line">{visitorRows.map((v) => <div key={v.id} className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><div className="min-w-0"><p className="truncate text-caption font-medium text-ink">{v.name}</p><p className="text-caption text-muted">{v.company ?? v.type} · {timeAgo(v.createdAt)}</p></div><Badge variant={v.status === "approved" ? "blue" : v.status === "pending" ? "warning" : "neutral"}>{v.status}</Badge></div>)}</div></Card>
        </aside>
      </div>
    </div>
  );
}
