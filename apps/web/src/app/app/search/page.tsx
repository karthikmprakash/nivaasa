import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, inArray, like as sqlLike, or } from "drizzle-orm";
import { BookUser, CalendarHeart, FileText, HelpCircle, Megaphone, MessageSquare, Search, ShoppingBag, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { amenities, classifieds, discussions, documents, helpdeskTickets, notices } from "@/db/schema";
import { noticeAudiencesForRole } from "@/lib/community-access";

export const metadata: Metadata = { title: "Search" };

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireResident();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const pattern = `%${term}%`;
  const results: { group: string; icon: typeof Search; items: { title: string; meta: string; href: string }[] }[] = [];

  if (term) {
    const [n, d, t, a, docs, c] = await Promise.all([
      db.select().from(notices).where(and(eq(notices.societyId, ctx.society.id), inArray(notices.audience, noticeAudiencesForRole(ctx.membership.role)), or(sqlLike(notices.title, pattern), sqlLike(notices.body, pattern)))).limit(6),
      db.select().from(discussions).where(and(eq(discussions.societyId, ctx.society.id), eq(discussions.status, "published"), or(sqlLike(discussions.title, pattern), sqlLike(discussions.body, pattern)))).limit(6),
      db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, ctx.society.id), eq(helpdeskTickets.unitId, ctx.unit.id), or(sqlLike(helpdeskTickets.subject, pattern), sqlLike(helpdeskTickets.description, pattern)))).limit(6),
      db.select().from(amenities).where(and(eq(amenities.societyId, ctx.society.id), or(sqlLike(amenities.name, pattern), sqlLike(amenities.description!, pattern)))).limit(4),
      db.select().from(documents).where(and(eq(documents.societyId, ctx.society.id), sqlLike(documents.title, pattern))).limit(4),
      db.select().from(classifieds).where(and(eq(classifieds.societyId, ctx.society.id), eq(classifieds.status, "active"), or(sqlLike(classifieds.title, pattern), sqlLike(classifieds.description, pattern)))).limit(4),
    ]);
    if (n.length) results.push({ group: "Notices", icon: Megaphone, items: n.map((x) => ({ title: x.title, meta: "Notice · " + x.category, href: `/app/community/notices/${x.id}` })) });
    if (d.length) results.push({ group: "Discussions", icon: MessageSquare, items: d.map((x) => ({ title: x.title, meta: "Discussion · " + x.category, href: `/app/community/discussions/${x.id}` })) });
    if (t.length) results.push({ group: "Helpdesk", icon: Wrench, items: t.map((x) => ({ title: x.subject, meta: `Ticket · ${x.status.replace("_", " ")}`, href: `/app/helpdesk/${x.id}` })) });
    if (a.length) results.push({ group: "Amenities", icon: CalendarHeart, items: a.map((x) => ({ title: x.name, meta: x.location ?? "Amenity", href: "/app/amenities" })) });
    if (docs.length) results.push({ group: "Documents", icon: FileText, items: docs.map((x) => ({ title: x.title, meta: "Document · " + x.category, href: "/app/documents" })) });
    if (c.length) results.push({ group: "Marketplace", icon: ShoppingBag, items: c.map((x) => ({ title: x.title, meta: "Listing · " + x.category, href: "/app/classifieds" })) });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Find anything" title="Search your community" description="Notices, conversations, requests, amenities and documents — all in one place." />
      <form action="/app/search" className="mt-5 flex h-12 items-center gap-3 rounded-2xl border border-line-strong bg-white px-4 shadow-[0_1px_2px_rgba(19,26,42,0.04)] focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
        <Search className="size-4 text-muted" />
        <input name="q" aria-label="Search community" defaultValue={q} autoFocus placeholder="Try “water”, “parking”, “Diwali”…" className="min-w-0 w-full bg-transparent text-body text-ink outline-none placeholder:text-muted" />
        <button className="rounded-full bg-brand-600 px-3.5 py-1.5 text-caption font-semibold text-white">Search</button>
      </form>
      {term ? (
        <div className="mt-6 space-y-5">
          {results.length ? results.map((group) => (
            <section key={group.group}>
              <div className="mb-2 flex items-center gap-2"><group.icon className="size-3.5 text-brand-600" /><h2 className="text-body font-semibold text-ink">{group.group}</h2><span className="text-caption text-muted">{group.items.length}</span></div>
              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                {group.items.map((item) => <Link key={item.href + item.title} href={item.href} className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3 last:border-0 hover:bg-[#fbfcff]"><div><p className="text-caption font-semibold text-ink">{item.title}</p><p className="text-caption text-muted capitalize">{item.meta}</p></div><span className="text-caption font-semibold text-brand-600">Open →</span></Link>)}
              </div>
            </section>
          )) : <div className="rounded-2xl border border-dashed border-line bg-white/60 px-5 py-14 text-center"><HelpCircle className="mx-auto size-6 text-muted" /><p className="mt-3 text-body font-semibold text-ink">No results for “{term}”</p><p className="mt-1 text-caption text-muted">Try a shorter word, or ask the community in a discussion.</p><Link href="/app/community/discussions/new" className="mt-3 inline-flex rounded-full bg-brand-600 px-3.5 py-2 text-caption font-semibold text-white">Start a discussion</Link></div>}</div>
      ) : (
        <div className="mt-6">
          <p className="text-caption font-bold uppercase tracking-[0.12em] text-muted">Try searching for</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["water", "parking", "Diwali", "maintenance", "lift", "pool"].map((s) => <Link key={s} href={`/app/search?q=${s}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-caption font-medium text-ink-soft hover:border-brand-200">{s}</Link>)}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[{ icon: Megaphone, t: "Notices", d: "Official updates" }, { icon: MessageSquare, t: "Discussions", d: "Neighbourhood Q&A" }, { icon: BookUser, t: "Directory", d: "Residents & help" }].map((c) => <Link key={c.t} href={c.t === "Directory" ? "/app/directory" : `/app/community?tab=${c.t.toLowerCase()}`} className="rounded-2xl border border-line bg-white p-4 hover:border-brand-200"><c.icon className="size-4 text-brand-600" /><p className="mt-2 text-caption font-semibold text-ink">{c.t}</p><p className="text-caption text-muted">{c.d}</p></Link>)}
          </div>
        </div>
      )}
    </div>
  );
}
