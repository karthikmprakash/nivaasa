import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { NewTicketForm } from "./new-ticket-form";
import { requireResident } from "@/lib/queries";

export const metadata: Metadata = { title: "Raise a request" };

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  await requireResident();
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app/helpdesk" className="mb-5 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to helpdesk</Link>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-600">Helpdesk</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-ink">Raise a request</h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-ink-soft">Tell us what&apos;s wrong and we&apos;ll route it to the right person with a clear timeline. You can track every update here.</p>
          <div className="mt-6 rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6"><NewTicketForm /></div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-[20px] bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.6)]">
            <Clock3 className="size-5 text-blush-200" />
            <p className="mt-3 text-[16px] font-semibold">What happens next</p>
            <ol className="mt-3 space-y-3">
              {[
                ["The right team is assigned", "Your request goes to the helpdesk manager based on category."],
                ["You get an ETA", "Once assigned, you'll see who's coming and when."],
                ["We follow up", `If no action is taken within its priority SLA, it escalates automatically.`],
              ].map(([t, d], i) => <li key={t} className="flex gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-caption font-bold">{i + 1}</span><div><p className="text-caption font-semibold">{t}</p><p className="mt-0.5 text-caption leading-relaxed text-white/80">{d}</p></div></li>)}
            </ol>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-center gap-2"><Zap className="size-4 text-amber-ink" /><p className="text-caption font-semibold text-ink">Urgent or a safety risk?</p></div>
            <p className="mt-1.5 text-caption leading-relaxed text-muted">For gas leaks, fire, or a security emergency, use the emergency button. It alerts the guard and the community team immediately.</p>
            <Link href="/app/emergency" className="mt-2 inline-flex text-caption font-semibold text-[#c43d4d]">Open emergency →</Link>
          </div>
          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4">
            <div className="flex items-center gap-2"><MessageSquare className="size-4 text-brand-600" /><p className="text-caption font-semibold text-ink">Already raised?</p></div>
            <p className="mt-1.5 text-caption leading-relaxed text-muted">Track status, reply to the team and rate the resolution from your helpdesk.</p>
            <Link href="/app/helpdesk" className="mt-2 inline-flex text-caption font-semibold text-brand-600">View my requests →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
