import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Armchair, Car, Cat, Gamepad2, Home, Phone, Search, ShoppingBag, Sparkles, Tag, Wrench } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CreateListingDialog } from "@/components/app/create-listing-dialog";
import { markClassifiedSold, deleteClassified } from "@/lib/actions/classifieds";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { classifieds, users } from "@/db/schema";
import { formatINR, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Buy & sell" };

export const dynamic = "force-dynamic";

const categories = [
  { v: "all", l: "All", icon: ShoppingBag },
  { v: "furniture", l: "Furniture", icon: Armchair },
  { v: "electronics", l: "Electronics", icon: Gamepad2 },
  { v: "vehicles", l: "Vehicles", icon: Car },
  { v: "kids", l: "Kids", icon: Cat },
  { v: "home", l: "Home", icon: Home },
  { v: "services", l: "Services", icon: Wrench },
];
const iconFor = (c: string) => categories.find((x) => x.v === c)?.icon ?? Tag;
const gradients = ["from-[#fde8ef] to-[#fff7fa]", "from-[#e6ecff] to-[#f7f9ff]", "from-[#e8f5ef] to-[#f8fdfb]", "from-[#fff3df] to-[#fffbf4]"];

export default async function ClassifiedsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string; mine?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const cat = params.cat ?? "all";
  const q = (params.q ?? "").trim();
  const mine = params.mine === "1";
  const rows = await db.select({ listing: classifieds, seller: users })
    .from(classifieds).innerJoin(users, eq(classifieds.sellerId, users.id))
    .where(and(eq(classifieds.societyId, ctx.society.id), eq(classifieds.status, "active")))
    .orderBy(desc(classifieds.createdAt));
  const list = rows.filter((r) => (cat === "all" || r.listing.category === cat) && (!mine || r.listing.sellerId === ctx.user.id) && (!q || r.listing.title.toLowerCase().includes(q.toLowerCase()) || r.listing.description.toLowerCase().includes(q.toLowerCase())));
  const myCount = rows.filter((r) => r.listing.sellerId === ctx.user.id).length;

  return (
    <div>
      <PageHeader eyebrow="Buy & sell" title="Community marketplace" description="Give good things a second home. List what you no longer need and buy from a neighbour you can trust." actions={<CreateListingDialog />} />

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {categories.map((c) => <Link key={c.v} href={`/app/classifieds?cat=${c.v}${mine ? "&mine=1" : ""}`} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-caption font-semibold ${cat === c.v ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-200"}`}><c.icon className="size-3.5" /> {c.l}</Link>)}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/classifieds?cat=${cat}&mine=${mine ? "0" : "1"}`} className={`rounded-full border px-3 py-2 text-caption font-semibold ${mine ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-white text-ink-soft"}`}>My listings ({myCount})</Link>
          <form action="/app/classifieds" className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 lg:w-56">
            <input type="hidden" name="cat" value={cat} /><Search className="size-4 text-muted" /><input name="q" aria-label="Search" enterKeyHint="search" defaultValue={params.q} placeholder="Search listings…" className="w-full bg-transparent text-caption outline-none placeholder:text-muted" />
          </form>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map(({ listing: l, seller }, i) => {
          const Icon = iconFor(l.category);
          const isMine = l.sellerId === ctx.user.id;
          return (
            <Card key={l.id} className="group overflow-hidden">
              <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${gradients[i % gradients.length]}`}>
                <div className="absolute inset-0 dot-paper opacity-25" />
                {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="size-full object-cover" /> : <Icon className="size-14 text-ink/15" strokeWidth={1.2} />}
                <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-ink-soft backdrop-blur">{l.category}</span>
                <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-body font-bold text-ink shadow-sm">{l.price ? formatINR(l.price) : "Free"}</span>
              </div>
              <div className="p-4">
                <p className="line-clamp-1 text-body font-semibold text-ink">{l.title}</p>
                <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted">{l.description}</p>
                <div className="mt-2 flex items-center gap-1.5"><Badge variant="outline">{l.condition.replace("_", " ")}</Badge><span className="text-caption text-muted">· {timeAgo(l.createdAt)}</span></div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div className="flex items-center gap-2"><Avatar name={seller.name} color={seller.avatarColor} size="xs" /><div><p className="text-caption font-semibold text-ink">{seller.name}</p><p className="text-caption text-muted">{isMine ? "Your listing" : "Verified neighbour"}</p></div></div>
                  {isMine ? (
                    <div className="flex items-center gap-2"><form action={markClassifiedSold}><input type="hidden" name="id" value={l.id} /><button className="text-caption font-semibold text-mint-600 hover:underline">Mark sold</button></form><form action={deleteClassified}><input type="hidden" name="id" value={l.id} /><button className="text-caption text-muted hover:text-[#c43d4d]">Delete</button></form></div>
                  ) : (
                    <a href={`tel:${seller.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1.5 text-caption font-semibold text-brand-700"><Phone className="size-4" /> Contact</a>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {!list.length ? <Card className="mt-2"><EmptyState icon={<ShoppingBag className="size-6" />} title={mine ? "You have no active listings" : "Nothing here yet"} description={mine ? "When you list something for sale, it will appear here." : "Be the first to give something a second life in your community."} action={<CreateListingDialog />} /></Card> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[18px] border border-line bg-white p-4"><Tag className="size-4 text-brand-600" /><p className="mt-2 text-caption font-semibold text-ink">A trusted circle</p><p className="mt-1 text-caption leading-relaxed text-muted">Only verified residents can see and post. Meet in common areas for handovers.</p></div>
        <div className="rounded-[18px] border border-line bg-white p-4"><Sparkles className="size-4 text-blush-500" /><p className="mt-2 text-caption font-semibold text-ink">A lighter home</p><p className="mt-1 text-caption leading-relaxed text-muted">Sell what you don&apos;t use. Somebody two floors away probably needs it.</p></div>
        <div className="rounded-[18px] border border-line bg-white p-4"><ShieldCheckIcon /><p className="mt-2 text-caption font-semibold text-ink">Safe by design</p><p className="mt-1 text-caption leading-relaxed text-muted">Transactions are between neighbours. Report suspicious listings to the committee.</p></div>
      </div>
    </div>
  );
}

function ShieldCheckIcon() {
  return <Sparkles className="size-4 text-mint-600" />;
}
