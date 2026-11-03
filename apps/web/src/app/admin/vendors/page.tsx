import Link from "next/link";
import { and, desc, eq, lte } from "drizzle-orm";
import { AlertTriangle, ArrowUpRight, BadgeCheck, Building2, CalendarClock, IndianRupee, Package, ShieldCheck, Star, Truck, Wrench } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { AddAssetDialog, AddVendorDialog } from "@/components/admin/vendor-dialogs";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { assets, expenses, vendors } from "@/db/schema";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const soon = new Date(); soon.setDate(soon.getDate() + 30);
  const [vendorRows, assetRows, spendRows] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.societyId, societyId)).orderBy(vendors.category, vendors.name),
    db.select({ asset: assets, vendor: vendors.name }).from(assets).leftJoin(vendors, eq(assets.amcVendorId, vendors.id)).where(eq(assets.societyId, societyId)).orderBy(assets.category, assets.name),
    db.select().from(expenses).where(eq(expenses.societyId, societyId)),
  ]);
  const spendByVendor = new Map<string, number>();
  for (const e of spendRows) if (e.vendorId) spendByVendor.set(e.vendorId, (spendByVendor.get(e.vendorId) ?? 0) + e.amount);
  const assetValue = assetRows.reduce((s, a) => s + (a.asset.value ?? 0), 0);
  const expiring = vendorRows.filter((v) => v.contractEnd && new Date(v.contractEnd) <= soon);
  const amcDue = assetRows.filter((a) => a.asset.amcDue && new Date(a.asset.amcDue) <= soon);
  return (
    <div>
      <PageHeader eyebrow="Procurement & assets" title="Vendors & assets" description="Every contract, every AMC and every piece of equipment — with the money and renewals in view." actions={<><AddVendorDialog /><AddAssetDialog vendors={vendorRows.map((v) => ({ id: v.id, name: v.name }))} /></>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Vendors" value={vendorRows.length} hint={`${vendorRows.filter((v) => v.status === "active").length} active contracts`} tone="blue" icon={<Truck className="size-4" />} />
        <Stat label="Renewals due" value={expiring.length} hint="Within 30 days" tone={expiring.length ? "pink" : "green"} icon={<CalendarClock className="size-4" />} />
        <Stat label="Asset value" value={formatINR(assetValue)} hint={`${assetRows.length} items tracked`} icon={<Package className="size-4" />} />
        <Stat label="AMC due" value={amcDue.length} hint="Assets needing service" tone="green" icon={<Wrench className="size-4" />} />
      </div>

      {expiring.length ? <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-ink/20 bg-amber-soft px-4 py-3"><AlertTriangle className="mt-0.5 size-4 text-amber-ink" /><div><p className="text-[11px] font-semibold text-ink">{expiring.length} contract{expiring.length > 1 ? "s" : ""} expiring soon</p><p className="text-[9.5px] text-ink-soft">{expiring.map((v) => v.name).join(", ")}. Review renewals before the expiry date.</p></div></div> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Vendor register" description="Contracts, contacts and spend" icon={<Building2 className="size-4" />} action={<AddVendorDialog />} />
            <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[720px]"><thead><tr className="bg-[#fbfcff]">{["Vendor", "Category", "Contact", "Contract", "Monthly", "Spend", "Rating"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{vendorRows.map((v) => <tr key={v.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-3"><p className="text-[10px] font-semibold text-ink">{v.name}</p><p className="text-[8px] text-muted">{v.gstin ?? "GST not recorded"}</p></td><td className="px-4 py-3 text-[8.5px] text-ink-soft">{v.category}</td><td className="px-4 py-3"><p className="text-[8.5px] text-ink-soft">{v.contactPerson}</p><p className="text-[8px] text-muted">{v.phone}</p></td><td className="px-4 py-3"><p className="text-[8.5px] text-ink-soft">{formatDate(v.contractStart)}</p><p className={`text-[8px] ${v.contractEnd && new Date(v.contractEnd) <= soon ? "font-semibold text-[#c43d4d]" : "text-muted"}`}>to {formatDate(v.contractEnd)}</p></td><td className="px-4 py-3 text-[9px] font-medium text-ink">{v.monthlyValue ? formatINR(v.monthlyValue) : "—"}</td><td className="px-4 py-3 text-[9px] text-ink-soft">{formatINR(spendByVendor.get(v.id) ?? 0)}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-ink"><Star className="size-2.5 fill-current" /> {v.rating?.toFixed(1)}</span></td></tr>)}</tbody></table></div>
          </Card>

          <Card>
            <CardHeader title="Asset register" description="Equipment, AMCs and condition" icon={<Package className="size-4" />} action={<AddAssetDialog vendors={vendorRows.map((v) => ({ id: v.id, name: v.name }))} />} />
            <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[720px]"><thead><tr className="bg-[#fbfcff]">{["Asset", "Category", "Location", "Qty", "Value", "AMC", "Condition"].map((h) => <th key={h} className="border-b border-line px-4 py-2.5 text-left text-[8px] font-bold uppercase tracking-[0.1em] text-muted">{h}</th>)}</tr></thead><tbody>{assetRows.map((a) => <tr key={a.asset.id} className="border-b border-line/70 last:border-0"><td className="px-4 py-3 text-[10px] font-semibold text-ink">{a.asset.name}</td><td className="px-4 py-3 text-[8.5px] text-muted">{a.asset.category}</td><td className="px-4 py-3 text-[8.5px] text-muted">{a.asset.location}</td><td className="px-4 py-3 text-[8.5px] text-ink-soft">{a.asset.quantity}</td><td className="px-4 py-3 text-[9px] text-ink">{a.asset.value ? formatINR(a.asset.value) : "—"}</td><td className="px-4 py-3"><p className="text-[8.5px] text-ink-soft">{a.vendor ?? "—"}</p><p className={`text-[8px] ${a.asset.amcDue && new Date(a.asset.amcDue) <= soon ? "font-semibold text-[#c43d4d]" : "text-muted"}`}>{a.asset.amcDue ? `due ${formatDate(a.asset.amcDue)}` : "No AMC"}</p></td><td className="px-4 py-3"><Badge variant={a.asset.condition === "good" ? "success" : a.asset.condition === "needs_service" ? "warning" : "neutral"}>{a.asset.condition.replace("_", " ")}</Badge></td></tr>)}</tbody></table></div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Procurement workflow" description="How purchases should move" icon={<ShieldCheck className="size-4" />} />
            <div className="border-t border-line px-4 py-4"><ol className="space-y-3">{[["Purchase request", "A committee member raises the need with an estimate."], ["Three quotes", "Pre-approved vendors submit comparable quotes."], ["Committee approval", "The treasurer and secretary sign off above threshold."], ["Work order", "A contract is stored with renewal reminders."], ["Expense & audit", "Invoice is recorded with vendor and GST details."]].map(([t, d], i) => <li key={t} className="flex gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[8px] font-bold text-brand-700">{i + 1}</span><div><p className="text-[9.5px] font-semibold text-ink">{t}</p><p className="text-[8.5px] leading-relaxed text-muted">{d}</p></div></li>)}</ol></div>
          </Card>
          <Card>
            <CardHeader title="Top spend" description="Lifetime by vendor" icon={<IndianRupee className="size-4" />} />
            <div className="border-t border-line px-4 py-3">{[...spendByVendor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amount]) => <div key={id} className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"><span className="max-w-[60%] truncate text-[9px] text-ink-soft">{vendorRows.find((v) => v.id === id)?.name}</span><span className="text-[9.5px] font-semibold text-ink">{formatINR(amount)}</span></div>)}</div>
          </Card>
          <div className="rounded-[18px] bg-gradient-to-br from-brand-50 to-blush-50 p-4"><p className="text-[10.5px] font-semibold text-ink">Audit-ready contracts</p><p className="mt-1 text-[9px] leading-relaxed text-ink-soft">All vendor documents, GST numbers and contract dates are visible to the committee and auditor. No more chasing WhatsApp attachments.</p></div>
        </aside>
      </div>
    </div>
  );
}
