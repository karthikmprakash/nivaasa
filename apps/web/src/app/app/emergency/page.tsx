import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Ambulance, ArrowRight, Flame, Phone, ShieldAlert, ShieldCheck, Siren, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { PanicButton } from "@/components/app/panic-button";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { panicAlerts } from "@/db/schema";
import { resolveMyAlert } from "@/lib/actions/emergency";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Emergency" };

export const dynamic = "force-dynamic";

const contacts = [
  { name: "Gate 1 · Security", phone: "+91 97400 22334", role: "24×7 gate desk", icon: ShieldCheck, tone: "bg-brand-50 text-brand-600" },
  { name: "Security manager", phone: "+91 98111 88990", role: "Imran Shaikh", icon: ShieldAlert, tone: "bg-[#f2effc] text-[#6a54c8]" },
  { name: "Community manager", phone: "+91 98450 89012", role: "Priya Nair", icon: UserRound, tone: "bg-blush-50 text-blush-500" },
  { name: "Ambulance", phone: "108", role: "National emergency", icon: Ambulance, tone: "bg-mint-50 text-mint-600" },
  { name: "Police", phone: "112", role: "National emergency", icon: Siren, tone: "bg-amber-soft text-amber-ink" },
  { name: "Fire", phone: "101", role: "National emergency", icon: Flame, tone: "bg-[#fdeced] text-[#c43d4d]" },
];

export default async function EmergencyPage() {
  const ctx = await requireResident();
  const alerts = await db.select().from(panicAlerts).where(and(eq(panicAlerts.societyId, ctx.society.id), eq(panicAlerts.userId, ctx.user.id))).orderBy(desc(panicAlerts.createdAt)).limit(5);
  const active = alerts.find((a) => ["open", "acknowledged"].includes(a.status));
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Safety first" title="Emergency" description="One tap alerts the guard and community team. Keep the numbers you might need in a hurry close at hand." actions={<Link href="/app/my-home" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-caption font-semibold text-ink-soft">Edit emergency contact</Link>} />
      {active ? (
        <div className="mt-5 rounded-2xl border border-[#f0c7cc] bg-gradient-to-r from-[#fdf1f3] to-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d94a5a] text-white"><ShieldAlert className="size-4" /></span><div><p className="text-body font-semibold text-ink">Active alert · {active.status === "open" ? "Security responding" : "Acknowledged"}</p><p className="text-caption text-[#9e4a55]">{active.message} · {formatDateTime(active.createdAt)}</p></div></div>
            <form action={resolveMyAlert}><input type="hidden" name="id" value={active.id} /><button className="rounded-full border border-[#e7a6ae] bg-white px-3.5 py-2 text-caption font-semibold text-[#a82f3e]">I am safe — resolve alert</button></form>
          </div>
        </div>
      ) : (
        <div className="mt-5"><PanicButton /></div>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fdf1f3] text-[#c43d4d]"><ShieldAlert className="size-4" /></span><div><p className="text-body font-semibold text-ink">Your emergency contact</p>{ctx.unit.emergencyName ? <p className="mt-0.5 text-caption text-muted">{ctx.unit.emergencyName} · {ctx.unit.emergencyContact}</p> : <p className="mt-0.5 text-caption text-muted">No emergency contact saved. Add one so the guard knows who to call if you can&apos;t be reached.</p>}<Link href="/app/my-home" className="mt-1 inline-flex text-caption font-semibold text-brand-600">Manage contact →</Link></div></div>
      </div>

      <div className="mt-6">
        <h2 className="text-base font-semibold text-ink">Emergency contacts</h2>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <a key={c.name} href={`tel:${c.phone.replace(/\s/g, "")}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-all hover:border-brand-200 hover:shadow-soft">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.tone}`}><c.icon className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="text-caption font-semibold text-ink">{c.name}</p><p className="text-caption text-muted">{c.role}</p></div>
              <span className="text-caption font-semibold text-brand-600 group-hover:underline">{c.phone}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[20px] border border-line bg-white p-5">
          <p className="text-caption font-semibold text-ink">If you&apos;re in immediate danger</p>
          <ol className="mt-2 space-y-2 text-caption leading-relaxed text-muted">
            <li className="flex gap-2"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-50 text-caption font-bold text-brand-700">1</span> Call 112 (police) or 108 (ambulance) first if life is at risk.</li>
            <li className="flex gap-2"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-50 text-caption font-bold text-brand-700">2</span> Then use the panic button so the gate knows responders are coming.</li>
            <li className="flex gap-2"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-50 text-caption font-bold text-brand-700">3</span> If it is safe, move to a well-lit common area and stay on the line.</li>
          </ol>
        </div>
        <div className="rounded-[20px] border border-line bg-[#fbfcff] p-5">
          <p className="text-caption font-semibold text-ink">Community safety drills</p>
          <p className="mt-1 text-caption leading-relaxed text-muted">Fire drills are conducted twice a year. The next drill is scheduled for 15 December at 10 AM. Floor marshals will guide residents to the assembly point on the east lawn.</p>
          <Link href="/app/community" className="mt-2 inline-flex items-center gap-1 text-caption font-semibold text-brand-600">See safety notices <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </div>
  );
}
