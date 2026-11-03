import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte } from "drizzle-orm";
import { CheckCircle2, Clock3, Copy, Package, PackageOpen, ShieldCheck, Truck } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { CopyCode } from "@/components/app/copy-code";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { deliveries } from "@/db/schema";
import { formatDate, formatTime, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Deliveries" };

export const dynamic = "force-dynamic";

export default async function DeliveriesPage() {
  const ctx = await requireResident();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const all = await db.select().from(deliveries).where(eq(deliveries.unitId, ctx.unit.id)).orderBy(desc(deliveries.createdAt));
  const active = all.filter((d) => ["arrived", "left_at_gate"].includes(d.status));
  const past = all.filter((d) => !["arrived", "left_at_gate"].includes(d.status));
  const month = await db.select({ id: deliveries.id }).from(deliveries).where(and(eq(deliveries.unitId, ctx.unit.id), gte(deliveries.createdAt, monthStart)));

  return (
    <div>
      <PageHeader eyebrow="Gate & security" title="Deliveries" description="Everything headed to your door — food, parcels and courier — with a clear handover record." actions={<Link href="/app/visitors/new" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-[12px] font-semibold text-white hover:bg-brand-700"><Package className="size-4" /> Pre-approve delivery</Link>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="At the gate" value={active.filter((d) => d.status === "arrived").length} hint="Awaiting your response" tone="pink" icon={<Clock3 className="size-4" />} />
        <Stat label="Kept at gate" value={active.filter((d) => d.status === "left_at_gate").length} hint="Collect with your code" tone="amber" icon={<PackageOpen className="size-4" />} />
        <Stat label="This month" value={month.length} hint="Deliveries received" tone="blue" icon={<Truck className="size-4" />} />
        <Stat label="Handover rate" value="100%" hint="Every parcel logged" tone="green" icon={<ShieldCheck className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <div className="mb-2.5 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-ink">Active deliveries</h2><span className="text-[10px] font-medium text-muted">{active.length} open</span></div>
          {active.length ? (
            <div className="space-y-3">
              {active.map((d) => (
                <Card key={d.id} className="relative overflow-hidden p-4 sm:p-5">
                  <div className={`absolute inset-y-0 left-0 w-[3px] ${d.status === "arrived" ? "bg-blush-400" : "bg-[#d9a23a]"}`} />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${d.status === "arrived" ? "bg-blush-50 text-blush-500" : "bg-amber-soft text-amber-ink"}`}><Package className="size-5" /></span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5"><p className="text-[13px] font-semibold text-ink">{d.company}</p><Badge variant={d.status === "arrived" ? "pink" : "warning"}>{d.status === "arrived" ? "At the gate" : "Kept at gate"}</Badge></div>
                        <p className="mt-0.5 text-[10.5px] text-muted">{d.courierName ?? "Delivery executive"} {d.trackingNo ? `· ${d.trackingNo}` : ""}</p>
                        {d.notes ? <p className="mt-1 text-[10px] text-ink-soft">{d.notes}</p> : null}
                        <p className="mt-1 text-[9.5px] text-muted">Arrived {timeAgo(d.createdAt)}</p>
                      </div>
                    </div>
                    {d.status === "left_at_gate" ? (
                      <div className="rounded-xl border border-amber-ink/15 bg-amber-soft/60 px-4 py-3 text-center">
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-amber-ink">Pickup code</p>
                        <p className="mt-0.5 font-mono text-[20px] font-bold tracking-[0.2em] text-ink">{d.otp}</p>
                        <div className="mt-1.5"><CopyCode code={d.otp ?? ""} /></div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-canvas px-3 py-2 text-[9.5px] leading-relaxed text-ink-soft sm:max-w-[160px]">Respond to the visitor request to approve, deny or leave at the gate.</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card><EmptyState icon={<PackageOpen className="size-6" />} title="Nothing at the gate" description="When a delivery arrives, you'll see it here and get a notification." /></Card>
          )}
          <Card className="mt-4">
            <CardHeader title="Delivery history" description="A record of everything delivered to your home" icon={<CheckCircle2 className="size-4" />} />
            <div className="border-t border-line">
              {past.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0">
                  <span className="grid size-8 place-items-center rounded-xl bg-mint-50 text-mint-600"><CheckCircle2 className="size-3.5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-semibold text-ink">{d.company} {d.trackingNo ? <span className="font-normal text-muted">· {d.trackingNo}</span> : null}</p><p className="text-[9.5px] text-muted">{formatDate(d.deliveredAt ?? d.createdAt)} · {formatTime(d.deliveredAt ?? d.createdAt)} · {d.courierName}</p></div>
                  <Badge variant="success">Delivered</Badge>
                </div>
              ))}
              {!past.length ? <p className="px-5 py-6 text-center text-[10.5px] text-muted">No past deliveries yet.</p> : null}
            </div>
          </Card>
        </div>
        <aside className="space-y-4">
          <div className="rounded-[20px] border border-line bg-white p-5">
            <div className="flex items-center gap-2"><PackageOpen className="size-4 text-brand-600" /><p className="text-[12px] font-semibold text-ink">Leave at gate, done right</p></div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted">When you choose “leave at gate”, the guard logs the parcel and generates a pickup code. Nothing is handed over without it.</p>
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted">A pickup code looks like</p>
              <p className="mt-1 flex items-center gap-2 font-mono text-[18px] font-bold tracking-[0.2em] text-ink">3 3 8 2 1 1 <Copy className="size-3.5 text-muted" /></p>
            </div>
          </div>
          <div className="rounded-[20px] bg-gradient-to-br from-brand-50 to-blush-50 p-5">
            <p className="text-[12px] font-semibold text-ink">Pre-approve your regulars</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-ink-soft">Milk, newspapers, laundry or that late-night biryani — create a recurring pass and skip the calls every time.</p>
            <Link href="/app/visitors/new" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10.5px] font-semibold text-brand-700 shadow-sm">Create a pass</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
