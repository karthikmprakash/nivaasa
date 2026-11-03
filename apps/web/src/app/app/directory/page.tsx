import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { BookUser, Building2, Car, Cat, Dog, PawPrint, Phone, Search, ShieldCheck, Star, Users, Home, Sparkles } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { memberships, pets, staff, towers, units, users, vehicles } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Directory" };

export const dynamic = "force-dynamic";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "•••••";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)}••• ••${digits.slice(-3)}`;
}

const tabs = [
  { v: "residents", l: "Residents", icon: Users },
  { v: "pets", l: "Pets", icon: PawPrint },
  { v: "vehicles", l: "Vehicles", icon: Car },
  { v: "help", l: "Daily help", icon: Sparkles },
];

const roleTabs = [
  { v: "all", l: "Everyone" },
  { v: "owners", l: "Owners" },
  { v: "tenants", l: "Tenants" },
  { v: "committee", l: "Committee" },
];

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; role?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const tab = params.tab ?? "residents";
  const q = (params.q ?? "").trim().toLowerCase();
  const roleFilter = params.role ?? "all";

  const [peopleRows, petRows, vehicleRows, helpRows, towerRows] = await Promise.all([
    db.select({ m: memberships, u: users, unit: units, tower: towers })
      .from(memberships).innerJoin(users, eq(memberships.userId, users.id))
      .leftJoin(units, eq(memberships.unitId, units.id)).leftJoin(towers, eq(units.towerId, towers.id))
      .where(and(eq(memberships.societyId, ctx.society.id), eq(memberships.status, "active"), eq(memberships.directoryVisible, true), inArray(memberships.role, ["owner", "tenant", "committee"])))
      .orderBy(asc(units.number)),
    db.select({ pet: pets, unit: units }).from(pets).innerJoin(units, eq(pets.unitId, units.id)).where(eq(pets.societyId, ctx.society.id)).orderBy(asc(units.number)),
    db.select({ vehicle: vehicles, unit: units }).from(vehicles).innerJoin(units, eq(vehicles.unitId, units.id)).where(eq(vehicles.societyId, ctx.society.id)).orderBy(asc(units.number)),
    db.select({ person: staff, unit: units }).from(staff).leftJoin(units, eq(staff.unitId, units.id)).where(and(eq(staff.societyId, ctx.society.id), eq(staff.active, true))).orderBy(asc(staff.kind), asc(staff.name)),
    db.select().from(towers).where(eq(towers.societyId, ctx.society.id)).orderBy(asc(towers.sortOrder)),
  ]);

  const people = peopleRows.filter((r) => {
    if (roleFilter === "owners" && !["owner", "committee"].includes(r.m.role)) return false;
    if (roleFilter === "tenants" && r.m.role !== "tenant") return false;
    if (roleFilter === "committee" && r.m.role !== "committee") return false;
    if (!q) return true;
    return r.u.name.toLowerCase().includes(q) || (r.unit?.number ?? "").toLowerCase().includes(q);
  });
  const help = helpRows.filter((r) => r.person.kind === "daily_help").filter((r) => !q || r.person.name.toLowerCase().includes(q) || r.person.role.toLowerCase().includes(q));
  const petsFiltered = petRows.filter((r) => !q || r.pet.name.toLowerCase().includes(q) || r.pet.species.toLowerCase().includes(q));
  const vehiclesFiltered = vehicleRows.filter((r) => !q || r.vehicle.registrationNo.toLowerCase().includes(q) || `${r.vehicle.make} ${r.vehicle.model}`.toLowerCase().includes(q));

  return (
    <div>
      <PageHeader eyebrow="Your neighbours" title="Directory" description="The people, pets and trusted help that make up your community. Phone numbers are masked by default." actions={<div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-caption font-medium text-muted"><ShieldCheck className="size-4 text-mint-600" /> Privacy-first directory</div>} />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {tabs.map((t) => <Link key={t.v} href={`/app/directory?${new URLSearchParams({ tab: t.v, role: roleFilter, q: params.q ?? "" })}`} aria-current={tab === t.v ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-caption font-semibold ${tab === t.v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}><t.icon className="size-3.5" /> {t.l}</Link>)}
        </div>
        <form action="/app/directory" className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 sm:w-64">
          <input type="hidden" name="tab" value={tab} /><input type="hidden" name="role" value={roleFilter} />
          <Search className="size-4 text-muted" />
          <input name="q" aria-label="Search" enterKeyHint="search" defaultValue={params.q} placeholder="Search name, flat or pet…" className="w-full bg-transparent text-caption text-ink outline-none placeholder:text-muted" />
        </form>
      </div>

      {tab === "residents" ? (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {roleTabs.map((r) => <Link key={r.v} href={`/app/directory?${new URLSearchParams({ tab: "residents", role: r.v, q: params.q ?? "" })}`} aria-current={roleFilter === r.v ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-caption font-semibold ${roleFilter === r.v ? "bg-ink text-white" : "bg-white text-ink-soft border border-line"}`}>{r.l}</Link>)}
          </div>
          <div className="space-y-6">
            {towerRows.map((tower) => {
              const members = people.filter((p) => p.tower?.id === tower.id);
              if (!members.length) return null;
              return (
                <section key={tower.id}>
                  <div className="mb-2.5 flex items-center gap-2"><span className="grid size-6 place-items-center rounded-lg bg-brand-50 text-brand-600"><Building2 className="size-4" /></span><h2 className="text-body font-semibold text-ink">Tower {tower.name} <span className="font-normal text-muted">({tower.code})</span></h2><span className="text-caption text-muted">{members.length} residents</span></div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map(({ m, u, unit }) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-[0_1px_2px_rgba(19,26,42,0.02)]">
                        <Avatar name={u.name} color={u.avatarColor} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5"><p className="truncate text-body font-semibold text-ink">{u.name}</p>{m.role === "committee" ? <Badge variant="pink">Committee</Badge> : null}</div>
                          <p className="text-caption text-muted">Home {unit?.number} · {m.role === "tenant" ? "Tenant" : "Owner"}{m.designation ? ` · ${m.designation}` : ""}</p>
                          <p className="mt-0.5 text-caption text-muted">{maskPhone(u.phone)}</p>
                        </div>
                        <a href={`tel:${ctx.society.name ? "+919740022334" : ""}`} aria-label={`Call ${u.name} via the guard`} className="grid size-7 place-items-center rounded-full bg-canvas text-muted hover:bg-brand-50 hover:text-brand-600"><Phone className="size-4" /></a>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
            {!people.length ? <Card><EmptyState icon={<BookUser className="size-6" />} title="No residents found" description="Try a different search or role filter." /></Card> : null}
          </div>
        </div>
      ) : null}

      {tab === "pets" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {petsFiltered.map(({ pet: p, unit }) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between">
                <span className={`grid size-10 place-items-center rounded-xl ${p.species === "Dog" ? "bg-amber-soft text-amber-ink" : p.species === "Cat" ? "bg-blush-50 text-blush-500" : "bg-brand-50 text-brand-600"}`}>{p.species === "Dog" ? <Dog className="size-5" /> : p.species === "Cat" ? <Cat className="size-5" /> : <PawPrint className="size-5" />}</span>
                <Badge variant={p.vaccinated ? "success" : "warning"}>{p.vaccinated ? "Vaccinated" : "Due"}</Badge>
              </div>
              <p className="mt-3 text-body font-semibold text-ink">{p.name}</p>
              <p className="text-caption text-muted">{p.breed ?? p.species} · {p.ageYears ? `${p.ageYears} yrs` : p.species} · Home {unit.number}</p>
              <p className="mt-2 text-caption text-muted">Next vaccination {p.vaccinationDue ? formatDate(p.vaccinationDue) : "not recorded"}</p>
              {p.notes ? <p className="mt-1 text-caption italic text-muted">{p.notes}</p> : null}
            </Card>
          ))}
          {!petsFiltered.length ? <Card className="sm:col-span-2 xl:col-span-3"><EmptyState icon={<PawPrint className="size-6" />} title="No pets found" description="Add your pet from My home to introduce them to the community." /></Card> : null}
        </div>
      ) : null}

      {tab === "vehicles" ? (
        <Card className="mt-5 overflow-hidden">
          <div className="divide-y divide-line">
            {vehiclesFiltered.map(({ vehicle: v, unit }) => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Car className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">{v.make} {v.model} <span className="font-normal text-muted">· {v.color}</span></p><p className="text-caption text-muted">Home {unit.number} · {v.parkingSlot ?? "No slot assigned"} · {v.type}</p></div>
                <span className="rounded-lg border border-line bg-canvas px-2 py-1 font-mono text-caption font-bold tracking-wide text-ink">{v.registrationNo}</span>
              </div>
            ))}
            {!vehiclesFiltered.length ? <EmptyState icon={<Car className="size-6" />} title="No vehicles found" /> : null}
          </div>
        </Card>
      ) : null}

      {tab === "help" ? (
        <div className="mt-5">
          <div className="mb-3 rounded-2xl border border-line bg-white p-4"><p className="text-caption font-semibold text-ink">Verified help, recommended by neighbours</p><p className="mt-1 text-caption text-muted">Daily help profiles are ID-verified and attached to a home. Contact them through the guard or your household.</p></div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {help.map(({ person: p, unit }) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={p.name} color={p.photoColor} size="md" />
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-body font-semibold text-ink">{p.name}</p>{p.policeVerified ? <ShieldCheck className="size-4 text-mint-600" /> : null}</div><p className="text-caption text-muted">{p.role} · Home {unit?.number ?? "Multiple"} </p><div className="mt-1 flex items-center gap-1"><span className="text-caption text-amber-ink">★</span><span className="text-caption font-semibold text-ink">{p.rating?.toFixed(1)}</span><span className="text-caption text-muted">· {p.shift}</span></div></div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5"><span className="text-caption text-muted">ID verified · {p.monthlyRate ? `₹${(p.monthlyRate / 100).toLocaleString("en-IN")}/mo` : "Rate on request"}</span><a href="tel:+919740022334" className="rounded-lg bg-brand-50 px-2 py-1 text-caption font-semibold text-brand-700">Contact via guard</a></div>
              </Card>
            ))}
            {!help.length ? <Card className="sm:col-span-2 xl:col-span-3"><EmptyState icon={<Sparkles className="size-6" />} title="No daily help listed" /></Card> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-line bg-[#fbfcff] p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-caption text-muted"><ShieldCheck className="size-4 text-mint-600" /> Only residents of {ctx.society.name} can see this directory. Contact numbers are masked.</p>
        <Link href="/app/settings#privacy" className="text-caption font-semibold text-brand-600">Manage my visibility</Link>
      </div>
    </div>
  );
}
