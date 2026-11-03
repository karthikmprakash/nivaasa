import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { ArrowDownToLine, BookOpenCheck, FileArchive, FileSpreadsheet, FileText, FolderOpen, Search, ShieldCheck, Stamp, ScrollText, ReceiptText } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };

export const dynamic = "force-dynamic";

const meta: Record<string, { label: string; icon: typeof FileText; tone: string }> = {
  bylaws: { label: "Bye-laws", icon: ScrollText, tone: "bg-brand-50 text-brand-600" },
  minutes: { label: "AGM minutes", icon: FileArchive, tone: "bg-blush-50 text-blush-500" },
  financials: { label: "Financials", icon: FileSpreadsheet, tone: "bg-mint-50 text-mint-600" },
  forms: { label: "Forms", icon: FileText, tone: "bg-amber-soft text-amber-ink" },
  circulars: { label: "Circulars", icon: Stamp, tone: "bg-[#f2effc] text-[#6a54c8]" },
  maintenance: { label: "Maintenance", icon: ReceiptText, tone: "bg-[#eef3f8] text-[#4b6a8a]" },
};
const categories = ["all", "bylaws", "minutes", "financials", "forms", "circulars", "maintenance"];

function sizeLabel(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const cat = params.cat ?? "all";
  const q = (params.q ?? "").toLowerCase();
  const role = ctx.membership.role;
  const visible = await db.select().from(documents).where(and(eq(documents.societyId, ctx.society.id), or(eq(documents.visibility, "all"), role === "tenant" ? eq(documents.visibility, "all") : inArray(documents.visibility, ["all", "owners", "committee"])))).orderBy(desc(documents.createdAt));
  const list = visible.filter((d) => (cat === "all" || d.category === cat) && (!q || d.title.toLowerCase().includes(q)));
  return (
    <div>
      <PageHeader eyebrow="The society archive" title="Documents" description="Bye-laws, AGM minutes, audited accounts and the forms you actually need — in one place, with the right access." actions={<div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-[10px] font-medium text-muted"><ShieldCheck className="size-3.5 text-mint-600" /> Access-controlled</div>} />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Documents" value={visible.length} hint="Available to you" tone="blue" icon={<FolderOpen className="size-4" />} />
        <Stat label="Categories" value={Object.keys(meta).length} hint="Organised and searchable" icon={<BookOpenCheck className="size-4" />} />
        <Stat label="Latest" value={formatDate(visible[0]?.createdAt)} hint={visible[0]?.category ?? "No documents"} tone="pink" icon={<FileText className="size-4" />} />
        <Stat label="Access" value="Role-based" hint="Owners and committee" tone="green" icon={<ShieldCheck className="size-4" />} />
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {categories.map((c) => <Link key={c} href={`/app/documents?cat=${c}`} className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold ${cat === c ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}>{c === "all" ? "All documents" : meta[c]?.label ?? c}</Link>)}
        </div>
        <form action="/app/documents" className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 lg:w-64">
          <input type="hidden" name="cat" value={cat} />
          <Search className="size-3.5 text-muted" />
          <input name="q" defaultValue={params.q} placeholder="Search documents…" className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted" />
        </form>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {list.map((d) => {
              const m = meta[d.category] ?? meta.circulars;
              const Icon = m.icon;
              return (
                <div key={d.id} className="flex items-center gap-3 px-5 py-4">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${m.tone}`}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><p className="text-[12px] font-semibold text-ink">{d.title}</p>{d.visibility !== "all" ? <Badge variant="outline">{d.visibility === "owners" ? "Owners" : "Committee"}</Badge> : null}</div>
                    <p className="mt-0.5 text-[9.5px] text-muted">{m.label} · {sizeLabel(d.fileSize)} · Uploaded {formatDate(d.createdAt)}</p>
                  </div>
                  <a href={d.fileUrl} target="_blank" download className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[9.5px] font-semibold text-ink-soft hover:border-brand-200 hover:text-brand-700"><ArrowDownToLine className="size-3" /> Download</a>
                </div>
              );
            })}
            {!list.length ? <EmptyState icon={<FolderOpen className="size-6" />} title="No documents here" description="Try another category or search term." /> : null}
          </div>
        </Card>
        <aside className="space-y-4">
          <div className="rounded-[20px] bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <p className="flex items-center gap-2 text-[11px] font-semibold"><FolderOpen className="size-4 text-blush-200" /> Looking for something?</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/55">If you need a document that isn&apos;t here — an NOC, a past AGM minute or an auditor&apos;s letter — ask the community office.</p>
            <Link href="/app/helpdesk/new" className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-[9.5px] font-bold text-brand-700">Request a document</Link>
          </div>
          <div className="rounded-[20px] border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink">Access levels</p>
            <div className="mt-2 space-y-2">
              {[["All residents", "General documents, forms and circulars"], ["Owners", "Financial statements and owner-only notices"], ["Committee", "Sensitive governance records"]].map(([l, d]) => <div key={l}><p className="text-[9.5px] font-semibold text-ink">{l}</p><p className="text-[8.5px] text-muted">{d}</p></div>)}
            </div>
          </div>
          <div className="rounded-[20px] border border-line bg-[#fbfcff] p-4">
            <p className="text-[11px] font-semibold text-ink">Document retention</p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted">Financial records are retained for 8 years, AGM minutes permanently, and operational circulars for 3 years.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
