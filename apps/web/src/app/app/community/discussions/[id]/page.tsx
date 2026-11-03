import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft, Clock3, Heart, MessageCircle, Pin, Send } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { discussionComments, discussions, users } from "@/db/schema";
import { addDiscussionComment } from "@/lib/actions/community";
import { formatDateTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireResident();
  const { id } = await params;
  const [row] = await db.select({ discussion: discussions, author: users }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(eq(discussions.id, id)).limit(1);
  if (!row || row.discussion.societyId !== ctx.society.id) notFound();
  const isAuthor = row.discussion.authorId === ctx.user.id;
  if (row.discussion.status !== "published" && !isAuthor) notFound();
  const comments = await db.select({ comment: discussionComments, author: users }).from(discussionComments).innerJoin(users, eq(discussionComments.authorId, users.id)).where(eq(discussionComments.discussionId, id)).orderBy(asc(discussionComments.createdAt));
  const d = row.discussion;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/community?tab=discussions" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Back to discussions</Link>
      {d.status !== "published" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-ink/20 bg-amber-soft px-3.5 py-2.5 text-[11px] font-medium text-amber-ink"><Clock3 className="size-3.5" /> This post is awaiting moderation and is only visible to you.</div>
      ) : null}
      <article className="rounded-[24px] border border-line bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.author.name} color={row.author.avatarColor} size="md" />
          <div><div className="flex items-center gap-1.5"><p className="text-[12px] font-semibold text-ink">{row.author.name}</p>{d.pinned ? <Pin className="size-3 text-blush-500" /> : null}</div><p className="text-[9.5px] text-muted">{formatDateTime(d.createdAt)} · {d.category.replace("_", " ")}</p></div>
        </div>
        <h1 className="mt-5 text-[26px] font-semibold leading-[1.18] tracking-[-0.035em] text-ink sm:text-[31px]">{d.title}</h1>
        <p className="mt-3 whitespace-pre-line text-[13.5px] leading-[1.85] text-ink-soft">{d.body}</p>
        <div className="mt-6 flex items-center gap-4 border-t border-line pt-4 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1"><Heart className="size-3" /> {d.likes} likes</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="size-3" /> {comments.length} replies</span>
          <Badge variant="outline">{d.category.replace("_", " ")}</Badge>
        </div>
      </article>

      <div className="mt-5">
        <h2 className="mb-2.5 text-[14px] font-semibold text-ink">Replies <span className="text-muted">({comments.length})</span></h2>
        <div className="space-y-2.5">
          {comments.map(({ comment: c, author }) => (
            <div key={c.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center gap-2"><Avatar name={author.name} color={author.avatarColor} size="xs" /><p className="text-[11px] font-semibold text-ink">{author.name}</p><span className="text-[9px] text-muted">{timeAgo(c.createdAt)}</span></div>
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-ink-soft">{c.body}</p>
            </div>
          ))}
          {!comments.length ? <div className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-8 text-center text-[11px] text-muted">No replies yet. Start the conversation.</div> : null}
        </div>
        {d.status === "published" ? (
          <form action={addDiscussionComment} className="mt-3 rounded-2xl border border-line bg-white p-4">
            <input type="hidden" name="discussionId" value={d.id} />
            <textarea name="body" required rows={3} placeholder="Add a thoughtful reply…" className="w-full resize-y rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink placeholder:text-[#a1a9ba] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
            <div className="mt-2 flex items-center justify-between"><p className="text-[9px] text-muted">Be kind. Your reply is visible to all residents.</p><SubmitButton size="sm" pendingText="Posting…"><Send className="size-3.5" /> Reply</SubmitButton></div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
