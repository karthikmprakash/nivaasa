import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ArrowRight, BadgeCheck, Building2, Car, CheckCircle2, Clock3, Dog, Home, IdCard, KeyRound,
  MoveRight, PawPrint, Phone, ShieldCheck, Sparkles, UserRound, Users, Wallet,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AddFamilyDialog, AddHelpDialog, AddPetDialog, AddVehicleDialog, ContactsForm, MoveRequestDialog } from "@/components/app/household-dialogs";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { familyMembers, moveRequests, pets, staff, staffAttendance, towers, vehicles } from "@/db/schema";
import { removeDailyHelp, removeFamilyMember, removePet, removeVehicle } from "@/lib/actions/household";
import { formatDate, formatTime, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "My home" };

export const dynamic = "force-dynamic";

export default async function MyHomePage() {
  const ctx = await requireResident();
  const [towerRows, family, vehicleRows, petRows, helpRows, attendance, moves] = await Promise.all([
    db.select().from(towers).where(eq(towers.id, ctx.unit.towerId)).limit(1),
    db.select().from(familyMembers).where(eq(familyMembers.membershipId, ctx.membership.id)),
    db.select().from(vehicles).where(eq(vehicles.unitId, ctx.unit.id)),
    db.select().from(pets).where(eq(pets.unitId, ctx.unit.id)),
    db.select().from(staff).where(and(eq(staff.unitId, ctx.unit.id), eq(staff.active, true))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.unitId, ctx.unit.id), eq(staffAttendance.date, todayISO()))),
    db.select().from(moveRequests).where(eq(moveRequests.unitId, ctx.unit.id)).orderBy(desc(moveRequests.createdAt)),
  ]);
  const tower = towerRows[0];
  const attendanceBy = new Map(attendance.map((a) => [a.staffId, a]));

  return (
    <div>
      <PageHeader eyebrow="Your home" title={`Home ${ctx.unit.number}`} description={`${tower?.name ?? ""} Tower · ${ctx.unit.unitType} · ${ctx.unit.areaSqft} sq ft`} actions={<MoveRequestDialog />} />

      <div className="mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.6)] sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Home className="size-6" /></span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Your home</p>
              <p className="mt-0.5 text-[24px] font-semibold tracking-[-0.03em]">Home {ctx.unit.number}</p>
              <p className="mt-1 text-[10.5px] text-white/55">{tower?.name} Tower · Floor {ctx.unit.floor} · {ctx.membership.role === "tenant" ? "Tenant" : "Owner"} · Since {formatDate(ctx.membership.joinedAt, { month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div><p className="text-[8.5px] uppercase tracking-wide text-white/40">Area</p><p className="mt-0.5 text-[14px] font-semibold">{ctx.unit.areaSqft} sq ft</p></div>
            <div><p className="text-[8.5px] uppercase tracking-wide text-white/40">Parking</p><p className="mt-0.5 text-[14px] font-semibold">{ctx.unit.parkingSlots} slot{ctx.unit.parkingSlots > 1 ? "s" : ""}</p></div>
            <div><p className="text-[8.5px] uppercase tracking-wide text-white/40">Family</p><p className="mt-0.5 text-[14px] font-semibold">{family.length + 1}</p></div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card id="family">
            <CardHeader title="Your household" description="Family members linked to this home" icon={<Users className="size-4" />} action={<AddFamilyDialog />} />
            <div className="border-t border-line">
              <div className="flex items-center gap-3 border-b border-line/70 px-5 py-3">
                <Avatar name={ctx.user.name} color={ctx.user.avatarColor} size="md" />
                <div className="flex-1"><div className="flex items-center gap-1.5"><p className="text-[12px] font-semibold text-ink">{ctx.user.name}</p><Badge variant="blue">You</Badge></div><p className="text-[9.5px] text-muted">{ctx.membership.role === "tenant" ? "Tenant" : "Owner"} · Primary contact</p></div>
                <span className="text-[9px] text-mint-600">App user</span>
              </div>
              {family.map((f) => (
                <div key={f.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                  <Avatar name={f.name} color="#9aa7c2" size="md" />
                  <div className="flex-1"><p className="text-[12px] font-semibold text-ink">{f.name}</p><p className="text-[9.5px] text-muted">{f.relation}{f.age ? ` · ${f.age} yrs` : ""} {f.hasApp ? "· App user" : ""}</p></div>
                  {f.phone ? <span className="text-[9px] text-muted">{f.phone}</span> : null}
                  <form action={removeFamilyMember}><input type="hidden" name="id" value={f.id} /><button className="text-[9px] font-medium text-muted hover:text-[#c43d4d]">Remove</button></form>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Vehicles" description={`${vehicleRows.length} registered`} icon={<Car className="size-4" />} action={<AddVehicleDialog />} />
              <div className="border-t border-line">
                {vehicleRows.map((v) => (
                  <div key={v.id} className="flex items-center gap-2.5 border-b border-line/70 px-4 py-3 last:border-0">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Car className="size-3.5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink">{v.make} {v.model}</p><p className="text-[8.5px] text-muted">{v.registrationNo} · {v.parkingSlot}</p></div>
                    <form action={removeVehicle}><input type="hidden" name="id" value={v.id} /><button className="text-[8.5px] text-muted hover:text-[#c43d4d]">×</button></form>
                  </div>
                ))}
                {!vehicleRows.length ? <p className="px-4 py-6 text-center text-[10px] text-muted">No vehicles registered.</p> : null}
              </div>
            </Card>
            <Card>
              <CardHeader title="Pets" description={`${petRows.length} in the directory`} icon={<PawPrint className="size-4" />} action={<AddPetDialog />} />
              <div className="border-t border-line">
                {petRows.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 border-b border-line/70 px-4 py-3 last:border-0">
                    <span className="grid size-8 place-items-center rounded-lg bg-amber-soft text-amber-ink"><Dog className="size-3.5" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-ink">{p.name}</p><p className="text-[8.5px] text-muted">{p.breed ?? p.species} · {p.vaccinated ? "Vaccinated" : "Vaccination due"}</p></div>
                    <form action={removePet}><input type="hidden" name="id" value={p.id} /><button className="text-[8.5px] text-muted hover:text-[#c43d4d]">×</button></form>
                  </div>
                ))}
                {!petRows.length ? <p className="px-4 py-6 text-center text-[10px] text-muted">No pets added.</p> : null}
              </div>
            </Card>
          </div>

          <Card id="help">
            <CardHeader title="Daily help" description="Your household staff, verified at the gate" icon={<Sparkles className="size-4" />} action={<AddHelpDialog />} />
            <div className="border-t border-line">
              {helpRows.map((s) => {
                const a = attendanceBy.get(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                    <Avatar name={s.name} color={s.photoColor} size="sm" />
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-[11px] font-semibold text-ink">{s.name}</p>{s.policeVerified ? <BadgeCheck className="size-3 text-mint-600" /> : <Badge variant="warning">Verification pending</Badge>}</div><p className="text-[9px] text-muted">{s.role} · {s.shift} · {s.rating?.toFixed(1)}★</p></div>
                    {a ? <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-mint-600"><CheckCircle2 className="size-3" /> In at {formatTime(a.checkInAt)}</span> : <span className="text-[9px] text-muted">Not in yet</span>}
                    <form action={removeDailyHelp}><input type="hidden" name="id" value={s.id} /><button className="text-[9px] text-muted hover:text-[#c43d4d]">Remove</button></form>
                  </div>
                );
              })}
              {!helpRows.length ? <p className="px-5 py-6 text-center text-[10px] text-muted">Add your house help, cook or driver to make gate entry seamless.</p> : null}
            </div>
          </Card>

          <Card id="move">
            <CardHeader title="Move requests" description="Plan a move-in or move-out" icon={<MoveRight className="size-4" />} action={<MoveRequestDialog />} />
            <div className="border-t border-line">
              {moves.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                  <span className={`grid size-8 place-items-center rounded-lg ${m.status === "approved" ? "bg-mint-50 text-mint-600" : "bg-amber-soft text-amber-ink"}`}><MoveRight className="size-3.5" /></span>
                  <div className="flex-1"><p className="text-[11px] font-semibold capitalize text-ink">{m.type.replace("_", " ")} · {formatDate(m.date)}</p><p className="text-[9px] text-muted">{m.notes ?? "No notes"}</p></div>
                  <Badge variant={m.status === "approved" ? "success" : m.status === "rejected" ? "danger" : "warning"}>{m.status}</Badge>
                </div>
              ))}
              {!moves.length ? <p className="px-5 py-6 text-center text-[10px] text-muted">No move requests. Planning one? We&apos;ll coordinate the lift and gate passes.</p> : null}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="e-Intercom & emergency" description="Where approval calls reach you" icon={<Phone className="size-4" />} />
            <div className="border-t border-line p-5"><ContactsForm defaults={{ intercomPrimary: ctx.unit.intercomPrimary ?? "", intercomSecondary: ctx.unit.intercomSecondary ?? "", emergencyName: ctx.unit.emergencyName ?? "", emergencyContact: ctx.unit.emergencyContact ?? "" }} /></div>
          </Card>
          <div className="rounded-[20px] border border-line bg-white p-4">
            <div className="flex items-center gap-2"><KeyRound className="size-4 text-brand-600" /><p className="text-[11.5px] font-semibold text-ink">How e-Intercom works</p></div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">If nobody answers the app, the guard calls the primary number. Secondary is used next. Keep these current when you travel.</p>
          </div>
          <div className="rounded-[20px] border border-line bg-[#fbfcff] p-4">
            <div className="flex items-center gap-2"><IdCard className="size-4 text-mint-600" /><p className="text-[11.5px] font-semibold text-ink">Ownership & tenancy</p></div>
            <div className="mt-2 space-y-1.5"><div className="flex justify-between text-[10px]"><span className="text-muted">Status</span><span className="font-semibold text-ink">{ctx.membership.role === "tenant" ? "Tenant" : "Owner"}</span></div><div className="flex justify-between text-[10px]"><span className="text-muted">Since</span><span className="font-medium text-ink">{formatDate(ctx.membership.joinedAt)}</span></div><div className="flex justify-between text-[10px]"><span className="text-muted">Unit type</span><span className="font-medium text-ink">{ctx.unit.unitType}</span></div></div>
            <p className="mt-2 text-[8.5px] leading-relaxed text-muted">To change ownership or add a tenant, raise a helpdesk request with supporting documents.</p>
            <Link href="/app/helpdesk/new" className="mt-2 inline-flex text-[9.5px] font-semibold text-brand-600">Request a change →</Link>
          </div>
          <div className="rounded-[20px] bg-gradient-to-br from-brand-50 to-blush-50 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink"><ShieldCheck className="size-3.5 text-brand-600" /> Your documents</p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-ink-soft">Bye-laws, the move form and society circulars are always available.</p>
            <Link href="/app/documents" className="mt-2 inline-flex items-center gap-1 text-[9.5px] font-semibold text-brand-600">Open document vault <ArrowRight className="size-3" /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
