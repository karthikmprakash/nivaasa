import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Eye, Megaphone, Pin, Share2, UserRound } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryLabel: Record<string, string> = { general: "General", maintenance: "Maintenance", security: "Security", event: "Event", finance: "Finance", emergency: "Emergency" };

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireResident();
  const { id } = await params;
  const [row] = await db.select({ notice: notices, author: users }).from(notices).leftJoin(users, eq(notices.authorId, users.id)).where(eq(notices.id, id)).limit(1);
  if (!row || row.notice.societyId !== ctx.society.id) notFound();
  await db.update(notices).set({ views: row.notice.views + 1 }).where(eq(notices.id, id));
  const n = row.notice;
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/community?tab=notices" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Back to community</Link>
      <article className="overflow-hidden rounded-[24px] border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-gradient-to-br from-brand-50 via-white to-blush-50 px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue"><Megaphone className="size-3" /> {categoryLabel[n.category]}</Badge>
            {n.pinned ? <Badge variant="pink"><Pin className="size-3" /> Pinned</Badge> : null}
            <span className="text-[10px] text-muted">{formatDateTime(n.publishedAt)}</span>
          </div>
          <h1 className="mt-4 text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[34px]">{n.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1.5"><UserRound className="size-3" /> {row.author?.name ?? "Community office"}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-3" /> {n.views + 1} views</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3" /> {formatDateTime(n.publishedAt)}</span>
          </div>
        </div>
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="whitespace-pre-line text-[13.5px] leading-[1.9] text-ink-soft">{n.body}</div>
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <div className="flex items-center gap-2.5">
              <Avatar name={row.author?.name ?? "Committee"} color={row.author?.avatarColor} size="sm" />
              <div><p className="text-[11px] font-semibold text-ink">{row.author?.name ?? "Community office"}</p><p className="text-[9.5px] text-muted">{n.audience === "owners" ? "Visible to owners" : "Visible to all residents"}</p></div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] font-semibold text-ink-soft"><Share2 className="size-3" /> Share</span>
          </div>
        </div>
      </article>
      <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
        <p className="text-[11px] font-semibold text-ink">Have a question about this notice?</p>
        <p className="mt-1 text-[10.5px] text-muted">Start a discussion or raise a helpdesk request and the committee will respond.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/app/community/discussions/new" className="rounded-full bg-brand-600 px-3.5 py-2 text-[10.5px] font-semibold text-white">Start a discussion</Link>
          <Link href="/app/helpdesk/new" className="rounded-full border border-line px-3.5 py-2 text-[10.5px] font-semibold text-ink-soft">Raise a request</Link>
        </div>
      </div>
    </div>
  );
}
