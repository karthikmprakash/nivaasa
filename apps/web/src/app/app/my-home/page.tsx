import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  ArrowRight, BadgeCheck, Building2, Car, CheckCircle2, Clock3, Dog, Home, IdCard, KeyRound,
  MoveRight, PawPrint, Phone, ShieldCheck, Sparkles, UserRound, Users, Wallet,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AddFamilyDialog, AddHelpDialog, AddPetDialog, AddVehicleDialog, ContactsForm, MoveRequestDialog, ReviewHelpDialog } from "@/components/app/household-dialogs";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { dailyHelpReviews, familyMembers, moveRequests, pets, staff, staffAttendance, towers, users, vehicles } from "@/db/schema";
import { removeDailyHelp, removeFamilyMember, removePet, removeVehicle } from "@/lib/actions/household";
import { formatDate, formatTime, todayISO } from "@/lib/utils";

export const metadata: Metadata = { title: "My home" };

export const dynamic = "force-dynamic";

export default async function MyHomePage() {
  const ctx = await requireResident();
  const [towerRows, family, vehicleRows, petRows, helpRows, attendance, moves, reviews] = await Promise.all([
    db.select().from(towers).where(eq(towers.id, ctx.unit.towerId)).limit(1),
    db.select().from(familyMembers).where(eq(familyMembers.membershipId, ctx.membership.id)),
    db.select().from(vehicles).where(eq(vehicles.unitId, ctx.unit.id)),
    db.select().from(pets).where(eq(pets.unitId, ctx.unit.id)),
    db.select().from(staff).where(and(eq(staff.unitId, ctx.unit.id), eq(staff.societyId, ctx.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.unitId, ctx.unit.id), gte(staffAttendance.date, todayISO(-13)))).orderBy(desc(staffAttendance.date)),
    db.select().from(moveRequests).where(eq(moveRequests.unitId, ctx.unit.id)).orderBy(desc(moveRequests.createdAt)),
    db.select({ review: dailyHelpReviews, author: users.name }).from(dailyHelpReviews)
      .innerJoin(staff, eq(staff.id, dailyHelpReviews.staffId))
      .innerJoin(users, eq(users.id, dailyHelpReviews.reviewerId))
      .where(and(eq(staff.unitId, ctx.unit.id), eq(staff.societyId, ctx.society.id), eq(staff.kind, "daily_help"), eq(staff.active, true)))
      .orderBy(desc(dailyHelpReviews.updatedAt)),
  ]);
  const tower = towerRows[0];
  const today = todayISO();

  return (
    <div>
      <PageHeader eyebrow="Your home" title={`Home ${ctx.unit.number}`} description={`${tower?.name ?? ""} Tower · ${ctx.unit.unitType} · ${ctx.unit.areaSqft} sq ft`} actions={<MoveRequestDialog />} />

      <div className="mt-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.6)] sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Home className="size-6" /></span>
            <div>
              <p className="text-caption font-bold uppercase tracking-[0.16em] text-white/80">Your home</p>
              <p className="mt-0.5 text-[24px] font-semibold tracking-[-0.03em]">Home {ctx.unit.number}</p>
              <p className="mt-1 text-caption text-white/80">{tower?.name} Tower · Floor {ctx.unit.floor} · {ctx.membership.role === "tenant" ? "Tenant" : "Owner"} · Since {formatDate(ctx.membership.joinedAt, { month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div><p className="text-caption uppercase tracking-wide text-white/80">Area</p><p className="mt-0.5 text-base font-semibold">{ctx.unit.areaSqft} sq ft</p></div>
            <div><p className="text-caption uppercase tracking-wide text-white/80">Parking</p><p className="mt-0.5 text-base font-semibold">{ctx.unit.parkingSlots} slot{ctx.unit.parkingSlots > 1 ? "s" : ""}</p></div>
            <div><p className="text-caption uppercase tracking-wide text-white/80">Family</p><p className="mt-0.5 text-base font-semibold">{family.length + 1}</p></div>
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
                <div className="flex-1"><div className="flex items-center gap-1.5"><p className="text-body font-semibold text-ink">{ctx.user.name}</p><Badge variant="blue">You</Badge></div><p className="text-caption text-muted">{ctx.membership.role === "tenant" ? "Tenant" : "Owner"} · Primary contact</p></div>
                <span className="text-caption text-mint-600">App user</span>
              </div>
              {family.map((f) => (
                <div key={f.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                  <Avatar name={f.name} color="#9aa7c2" size="md" />
                  <div className="flex-1"><p className="text-body font-semibold text-ink">{f.name}</p><p className="text-caption text-muted">{f.relation}{f.age ? ` · ${f.age} yrs` : ""} {f.hasApp ? "· App user" : ""}</p></div>
                  {f.phone ? <span className="text-caption text-muted">{f.phone}</span> : null}
                  <form action={removeFamilyMember}><input type="hidden" name="id" value={f.id} /><button className="text-caption font-medium text-muted hover:text-[#c43d4d]">Remove</button></form>
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
                    <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Car className="size-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{v.make} {v.model}</p><p className="text-caption text-muted">{v.registrationNo} · {v.parkingSlot}</p></div>
                    <form action={removeVehicle}><input type="hidden" name="id" value={v.id} /><button className="text-caption text-muted hover:text-[#c43d4d]">×</button></form>
                  </div>
                ))}
                {!vehicleRows.length ? <p className="px-4 py-6 text-center text-caption text-muted">No vehicles registered.</p> : null}
              </div>
            </Card>
            <Card>
              <CardHeader title="Pets" description={`${petRows.length} in the directory`} icon={<PawPrint className="size-4" />} action={<AddPetDialog />} />
              <div className="border-t border-line">
                {petRows.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 border-b border-line/70 px-4 py-3 last:border-0">
                    <span className="grid size-8 place-items-center rounded-lg bg-amber-soft text-amber-ink"><Dog className="size-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{p.name}</p><p className="text-caption text-muted">{p.breed ?? p.species} · {p.vaccinated ? "Vaccinated" : "Vaccination due"}</p></div>
                    <form action={removePet}><input type="hidden" name="id" value={p.id} /><button className="text-caption text-muted hover:text-[#c43d4d]">×</button></form>
                  </div>
                ))}
                {!petRows.length ? <p className="px-4 py-6 text-center text-caption text-muted">No pets added.</p> : null}
              </div>
            </Card>
          </div>

          <Card id="help" className="scroll-mt-24">
            <CardHeader title="Daily help" description="Registration, gate attendance and private household reviews" icon={<Sparkles className="size-4" />} action={<AddHelpDialog />} />
            <div className="divide-y divide-line border-t border-line">
              {helpRows.map((s) => {
                const visits = attendance.filter((a) => a.staffId === s.id && a.checkInAt);
                const current = visits.find((a) => a.date === today);
                const feedback = reviews.filter(({ review }) => review.staffId === s.id);
                const ownReview = feedback.find(({ review }) => review.reviewerId === ctx.user.id)?.review;
                const rating = feedback.length ? feedback.reduce((total, { review }) => total + review.rating, 0) / feedback.length : null;
                return (
                  <div key={s.id} className="space-y-3 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar name={s.name} color={s.photoColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-body font-semibold text-ink">{s.name}</p>
                        <p className="text-caption text-muted">{s.role}{s.shift ? ` · ${s.shift}` : ""}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant={s.policeVerified ? "success" : "warning"}>{s.policeVerified ? <><BadgeCheck aria-hidden="true" className="size-4" /> Verified</> : "Verification pending"}</Badge>
                          <span className="text-caption font-medium text-ink-soft">{current?.checkOutAt ? `Left at ${formatTime(current.checkOutAt)}` : current?.checkInAt ? `In at ${formatTime(current.checkInAt)}` : "No check-in today"}</span>
                        </div>
                      </div>
                    </div>
                    <details className="rounded-control border border-line px-3">
                      <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium text-ink">Attendance · {visits.length} {visits.length === 1 ? "day" : "days"} in the last 14</summary>
                      {visits.length ? <ul className="divide-y divide-line pb-2">{visits.map((visit) => (
                        <li key={visit.id} className="flex flex-wrap justify-between gap-x-3 py-2 text-caption"><time dateTime={visit.date} className="font-medium text-ink">{formatDate(visit.checkInAt, { day: "numeric", month: "short" })}</time><span className="text-muted">In {formatTime(visit.checkInAt)}{visit.checkOutAt ? ` · Out ${formatTime(visit.checkOutAt)}` : ""}</span></li>
                      ))}</ul> : <p className="pb-3 text-caption text-muted">Attendance will appear after the first check-in.</p>}
                    </details>
                    {s.policeVerified ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-auto text-caption text-muted">{rating === null ? "No household reviews yet" : `${rating.toFixed(1)} / 5 · ${feedback.length} household ${feedback.length === 1 ? "review" : "reviews"}`}</span>
                        <ReviewHelpDialog person={{ id: s.id, name: s.name }} review={ownReview} />
                      </div>
                    ) : null}
                    {feedback.length ? <details className="rounded-control border border-line px-3">
                      <summary className="min-h-11 cursor-pointer py-2.5 text-body font-medium text-ink">Private reviews</summary>
                      <ul className="divide-y divide-line pb-2">{feedback.map(({ review, author }) => <li key={review.id} className="py-2 text-caption"><p className="font-semibold text-ink">{author} · {review.rating} / 5</p>{review.review ? <p className="mt-1 whitespace-pre-wrap break-words text-ink-soft">{review.review}</p> : null}</li>)}</ul>
                    </details> : null}
                    <form action={removeDailyHelp}><input type="hidden" name="id" value={s.id} /><button className="min-h-11 text-caption font-semibold text-[#b83244] hover:underline">Remove registration</button></form>
                  </div>
                );
              })}
              {!helpRows.length ? <p className="px-5 py-6 text-center text-body text-muted">Register your housekeeper, cook or driver to track their gate attendance.</p> : null}
            </div>
          </Card>

          <Card id="move">
            <CardHeader title="Move requests" description="Plan a move-in or move-out" icon={<MoveRight className="size-4" />} action={<MoveRequestDialog />} />
            <div className="border-t border-line">
              {moves.map((m) => (
                <div key={m.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                  <span className={`grid size-8 place-items-center rounded-lg ${m.status === "approved" ? "bg-mint-50 text-mint-600" : "bg-amber-soft text-amber-ink"}`}><MoveRight className="size-4" /></span>
                  <div className="flex-1"><p className="text-caption font-semibold capitalize text-ink">{m.type.replace("_", " ")} · {formatDate(m.date)}</p><p className="text-caption text-muted">{m.notes ?? "No notes"}</p></div>
                  <Badge variant={m.status === "approved" ? "success" : m.status === "rejected" ? "danger" : "warning"}>{m.status}</Badge>
                </div>
              ))}
              {!moves.length ? <p className="px-5 py-6 text-center text-caption text-muted">No move requests. Planning one? We&apos;ll coordinate the lift and gate passes.</p> : null}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="e-Intercom & emergency" description="Where approval calls reach you" icon={<Phone className="size-4" />} />
            <div className="border-t border-line p-5"><ContactsForm defaults={{ intercomPrimary: ctx.unit.intercomPrimary ?? "", intercomSecondary: ctx.unit.intercomSecondary ?? "", emergencyName: ctx.unit.emergencyName ?? "", emergencyContact: ctx.unit.emergencyContact ?? "" }} /></div>
          </Card>
          <div className="rounded-[20px] border border-line bg-white p-4">
            <div className="flex items-center gap-2"><KeyRound className="size-4 text-brand-600" /><p className="text-caption font-semibold text-ink">How e-Intercom works</p></div>
            <p className="mt-1.5 text-caption leading-relaxed text-muted">If nobody answers the app, the guard calls the primary number. Secondary is used next. Keep these current when you travel.</p>
          </div>
          <div className="rounded-[20px] border border-line bg-[#fbfcff] p-4">
            <div className="flex items-center gap-2"><IdCard className="size-4 text-mint-600" /><p className="text-caption font-semibold text-ink">Ownership & tenancy</p></div>
            <div className="mt-2 space-y-1.5"><div className="flex justify-between text-caption"><span className="text-muted">Status</span><span className="font-semibold text-ink">{ctx.membership.role === "tenant" ? "Tenant" : "Owner"}</span></div><div className="flex justify-between text-caption"><span className="text-muted">Since</span><span className="font-medium text-ink">{formatDate(ctx.membership.joinedAt)}</span></div><div className="flex justify-between text-caption"><span className="text-muted">Unit type</span><span className="font-medium text-ink">{ctx.unit.unitType}</span></div></div>
            <p className="mt-2 text-caption leading-relaxed text-muted">To change ownership or add a tenant, raise a helpdesk request with supporting documents.</p>
            <Link href="/app/helpdesk/new" className="mt-2 inline-flex text-caption font-semibold text-brand-600">Request a change →</Link>
          </div>
          <div className="rounded-[20px] bg-gradient-to-br from-brand-50 to-blush-50 p-4">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-ink"><ShieldCheck className="size-4 text-brand-600" /> Your documents</p>
            <p className="mt-1 text-caption leading-relaxed text-ink-soft">Bye-laws, the move form and society circulars are always available.</p>
            <Link href="/app/documents" className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-brand-600">Open document vault <ArrowRight className="size-4" /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
