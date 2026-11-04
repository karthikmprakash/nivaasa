import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Eye, Megaphone, Pin, UserRound } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/primitives";
import { NoticeViewTracker } from "@/components/app/notice-view-tracker";
import { ShareNoticeButton } from "@/components/app/share-notice";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { canViewNoticeAudience } from "@/lib/community-access";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryLabel: Record<string, string> = { general: "General", maintenance: "Maintenance", security: "Security", event: "Event", finance: "Finance", emergency: "Emergency" };

export default async function NoticePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireResident();
  const { id } = await params;
  const [row] = await db.select({ notice: notices, author: users }).from(notices).leftJoin(users, eq(notices.authorId, users.id)).where(eq(notices.id, id)).limit(1);
  if (!row || row.notice.societyId !== ctx.society.id || !canViewNoticeAudience(ctx.membership.role, row.notice.audience, row.notice.towerId, ctx.unit.towerId)) notFound();
  const n = row.notice;
  return (
    <div className="mx-auto max-w-3xl">
      <NoticeViewTracker id={n.id} />
      <Link href="/app/community?tab=notices" className="mb-5 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Back to community</Link>
      <article className="overflow-hidden rounded-[24px] border border-line bg-white shadow-soft">
        <div className="border-b border-line bg-gradient-to-br from-brand-50 via-white to-blush-50 px-6 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="blue"><Megaphone className="size-4" /> {categoryLabel[n.category]}</Badge>
            {n.pinned ? <Badge variant="pink"><Pin className="size-4" /> Pinned</Badge> : null}
            <span className="text-caption text-muted">{formatDateTime(n.publishedAt)}</span>
          </div>
          <h1 className="mt-4 text-[27px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink sm:text-[34px]">{n.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-caption text-muted">
            <span className="inline-flex items-center gap-1.5"><UserRound className="size-4" /> {row.author?.name ?? "Community office"}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /> {n.views} views</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> {formatDateTime(n.publishedAt)}</span>
          </div>
        </div>
        <div className="px-6 py-7 sm:px-8 sm:py-9">
          <div className="whitespace-pre-line text-body leading-[1.9] text-ink-soft">{n.body}</div>
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <div className="flex items-center gap-2.5">
              <Avatar name={row.author?.name ?? "Committee"} color={row.author?.avatarColor} size="sm" />
              <div><p className="text-caption font-semibold text-ink">{row.author?.name ?? "Community office"}</p><p className="text-caption text-muted">{n.audience === "owners" ? "Visible to owners" : n.audience === "tenants" ? "Visible to tenants" : n.audience === "tower" ? "Visible to the selected tower" : "Visible to all residents"}</p></div>
            </div>
            <ShareNoticeButton title={n.title} text={n.body.slice(0, 160)} />
          </div>
        </div>
      </article>
      <div className="mt-4 rounded-[18px] border border-line bg-white p-4">
        <p className="text-caption font-semibold text-ink">Have a question about this notice?</p>
        <p className="mt-1 text-caption text-muted">Start a discussion or raise a helpdesk request and the committee will respond.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/app/community/discussions/new" className="rounded-full bg-brand-600 px-3.5 py-2 text-caption font-semibold text-white">Start a discussion</Link>
          <Link href="/app/helpdesk/new" className="rounded-full border border-line px-3.5 py-2 text-caption font-semibold text-ink-soft">Raise a request</Link>
        </div>
      </div>
    </div>
  );
}
