import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { PreApproveForm } from "./pre-approve-form";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pre-approve a visitor" };

export const dynamic = "force-dynamic";

export default async function NewVisitorPage() {
  const ctx = await requireResident();
  const recent = await db.select().from(visitors).where(and(eq(visitors.unitId, ctx.unit.id), eq(visitors.preApproved, true))).orderBy(desc(visitors.createdAt)).limit(3);
  return (
    <div>
      <Link href="/app/visitors" className="mb-5 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to visitors</Link>
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-brand-600">Visitors</p>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.04em] text-ink">Pre-approve a visitor</h1>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-ink-soft">Skip the gate call. Generate a pass with a 6-digit code your visitor can share with the guard.</p>
          <div className="mt-6 rounded-[22px] border border-line bg-white p-5 shadow-soft sm:p-6"><PreApproveForm /></div>
        </div>
        <aside className="space-y-4">
          <div className="rounded-[20px] bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[0_24px_50px_-24px_rgba(49,85,216,0.6)]">
            <KeyRound className="size-5 text-blush-200" />
            <p className="mt-3 text-[16px] font-semibold">How a pass works</p>
            <ol className="mt-3 space-y-3">
              {[
                ["Create the pass", "Choose the visitor type, date and how long it's valid."],
                ["Share the code", "We generate a 6-digit code. Send it to your visitor."],
                ["The guard verifies", "No calls, no waiting. The guard checks the code at the gate."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-caption font-bold">{i + 1}</span><div><p className="text-caption font-semibold">{t}</p><p className="mt-0.5 text-caption leading-relaxed text-white/80">{d}</p></div></li>
              ))}
            </ol>
          </div>
          <div className="rounded-[18px] border border-line bg-white p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-mint-600" /><p className="text-caption font-semibold text-ink">Safe by default</p></div>
            <p className="mt-1.5 text-caption leading-relaxed text-muted">Passcodes are single-use at the gate. You can cancel an unused pass any time from your visitors page.</p>
          </div>
          {recent.length ? (
            <div className="rounded-[18px] border border-line bg-white p-4">
              <div className="flex items-center justify-between"><p className="text-caption font-semibold text-ink">Recent passes</p><Link href="/app/visitors" className="text-caption font-semibold text-brand-600">All</Link></div>
              <div className="mt-3 space-y-2.5">
                {recent.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><p className="truncate text-caption font-semibold text-ink">{v.name}</p><p className="text-caption text-muted">{formatDate(v.validFrom)} · {v.type.replace("_", " ")}</p></div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 font-mono text-caption font-bold text-brand-700"><Clock3 className="size-4" /> {v.code}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <Link href="/app/my-home#help" className="flex items-center justify-between rounded-[18px] border border-line bg-[#fbfcff] p-4 text-caption font-semibold text-ink-soft hover:text-ink">Manage frequent visitors <ChevronRight className="size-4" /></Link>
        </aside>
      </div>
    </div>
  );
}
