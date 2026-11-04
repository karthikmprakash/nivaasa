import Link from "next/link";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { CalendarDays, CheckCircle2, ChevronRight, Eye, Flag, Heart, Megaphone, MessageSquare, Pin, ShoppingBag, Trash2, Vote, XCircle } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { PublishNoticeDialog, CreatePollDialog, CreateEventDialog } from "@/components/admin/communication-dialogs";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { classifieds, discussions, eventRsvps, events, notices, pollVotes, polls, users } from "@/db/schema";
import { closePoll, deleteNotice, moderateDiscussion, removeClassified } from "@/lib/actions/communications";
import { formatDate, formatTime, timeAgo } from "@/lib/utils";

export const metadata = { title: "Communications" };

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const ctx = await requireAdmin();
  const societyId = ctx.society!.id;
  const [noticeRows, pendingRows, allDiscussionRows, pollRows, voteRows, eventRows, rsvpRows, classifiedRows] = await Promise.all([
    db.select({ notice: notices, author: users }).from(notices).leftJoin(users, eq(notices.authorId, users.id)).where(eq(notices.societyId, societyId)).orderBy(desc(notices.pinned), desc(notices.publishedAt)).limit(10),
    db.select({ discussion: discussions, user: users }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "pending"))).orderBy(desc(discussions.createdAt)),
    db.select({ count: sql<number>`count(*)` }).from(discussions).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "published"))),
    db.select().from(polls).where(eq(polls.societyId, societyId)).orderBy(desc(polls.createdAt)).limit(6),
    db.select({ pollId: pollVotes.pollId, count: count() }).from(pollVotes).where(inArray(pollVotes.pollId, db.select({ id: polls.id }).from(polls).where(eq(polls.societyId, societyId)))).groupBy(pollVotes.pollId),
    db.select().from(events).where(eq(events.societyId, societyId)).orderBy(desc(events.startAt)).limit(5),
    db.select({ eventId: eventRsvps.eventId, count: count() }).from(eventRsvps).groupBy(eventRsvps.eventId),
    db.select({ listing: classifieds, seller: users }).from(classifieds).innerJoin(users, eq(classifieds.sellerId, users.id)).where(and(eq(classifieds.societyId, societyId), eq(classifieds.status, "active"))).orderBy(desc(classifieds.createdAt)).limit(6),
  ]);
  const voteBy = new Map(voteRows.map((v) => [v.pollId, v.count]));
  const rsvpBy = new Map(rsvpRows.map((r) => [r.eventId, r.count]));
  return (
    <div>
      <PageHeader
        eyebrow="Community engagement"
        title="Communications"
        description="Notices, polls, events and conversations — with moderation that keeps the feed useful."
        actions={<div className="flex flex-wrap gap-2"><PublishNoticeDialog /><CreatePollDialog /><CreateEventDialog /></div>}
      />
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Notices" value={noticeRows.length} hint="Published updates" tone="blue" icon={<Megaphone className="size-4" />} />
        <Stat label="Moderation queue" value={pendingRows.length} hint={pendingRows.length ? "Needs review" : "All clear"} tone={pendingRows.length ? "pink" : "green"} icon={<Flag className="size-4" />} />
        <Stat label="Active polls" value={pollRows.filter((p) => p.status === "active").length} hint={`${voteRows.reduce((s, v) => s + v.count, 0)} votes cast`} icon={<Vote className="size-4" />} />
        <Stat label="Discussions" value={allDiscussionRows[0]?.count ?? 0} hint="Published conversations" tone="green" icon={<MessageSquare className="size-4" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Notices" description="Recent official communication" icon={<Megaphone className="size-4" />} action={<PublishNoticeDialog />} />
            <div className="border-t border-line">
              {noticeRows.map(({ notice: n, author }) => (
                <div key={n.id} className="flex items-start gap-3 border-b border-line/70 px-5 py-3.5 last:border-0">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><Badge variant={n.category === "security" ? "purple" : n.category === "event" ? "pink" : n.category === "finance" ? "success" : "neutral"}>{n.category}</Badge>{n.pinned ? <Pin className="size-4 text-blush-500" /> : null}<span className="text-caption text-muted">{formatDate(n.publishedAt)} · {author?.name}</span></div><p className="mt-1 text-caption font-semibold text-ink">{n.title}</p><p className="mt-0.5 line-clamp-1 text-caption text-muted">{n.body.replace(/\n/g, " ")}</p></div>
                  <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 text-caption text-muted"><Eye className="size-4" />{n.views}</span><form action={deleteNotice}><input type="hidden" name="id" value={n.id} /><button className="text-caption text-muted hover:text-[#c43d4d]">Delete</button></form></div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Polls" description="Community decisions in progress" icon={<Vote className="size-4" />} action={<CreatePollDialog />} />
            <div className="border-t border-line">
              {pollRows.map((p) => (
                <div key={p.id} className="border-b border-line/70 px-5 py-3.5 last:border-0">
                  <div className="flex items-start justify-between gap-2"><div><div className="flex items-center gap-1.5"><Badge variant={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>{p.secret ? <Badge variant="outline">Secret</Badge> : null}<span className="text-caption text-muted">{p.audience}</span></div><p className="mt-1 text-caption font-semibold text-ink">{p.question}</p></div><div className="text-right"><p className="text-body font-semibold text-ink">{voteBy.get(p.id) ?? 0}</p><p className="text-caption text-muted">votes</p></div></div>
                  <div className="mt-2 flex items-center justify-between"><span className="text-caption text-muted">{p.status === "active" && p.endsAt ? `Closes ${formatDate(p.endsAt)}` : "Closed"}</span>{p.status === "active" ? <form action={closePoll}><input type="hidden" name="id" value={p.id} /><button className="text-caption font-semibold text-[#c43d4d]">Close poll</button></form> : null}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Events" description="Upcoming and recent community moments" icon={<CalendarDays className="size-4" />} action={<CreateEventDialog />} />
            <div className="border-t border-line">
              {eventRows.map((e) => <div key={e.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blush-50 text-center"><span className="text-caption font-bold uppercase text-blush-500">{formatDate(e.startAt, { month: "short" })}</span><span className="text-caption font-bold leading-none text-ink">{new Date(e.startAt).getDate()}</span></div><div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{e.title}</p><p className="text-caption text-muted">{formatDate(e.startAt)} · {formatTime(e.startAt)} · {e.location}</p></div><span className="text-caption text-muted">{rsvpBy.get(e.id) ?? 0} RSVP</span></div>)}
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Needs moderation" description={`${pendingRows.length} discussion${pendingRows.length === 1 ? "" : "s"}`} icon={<Flag className="size-4" />} />
            <div className="border-t border-line">
              {pendingRows.map(({ discussion: d, user }) => (
                <div key={d.id} className="border-b border-line/70 px-4 py-3.5 last:border-0">
                  <div className="flex items-center gap-2"><Avatar name={user.name} color={user.avatarColor} size="xs" /><p className="text-caption font-semibold text-ink">{user.name}</p><span className="text-caption text-muted">· {timeAgo(d.createdAt)}</span></div>
                  <p className="mt-1.5 text-caption font-semibold text-ink">{d.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted">{d.body}</p>
                  <div className="mt-2 flex gap-1.5"><form action={moderateDiscussion}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="decision" value="publish" /><button className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-caption font-bold text-mint-600"><CheckCircle2 className="size-4" /> Publish</button></form><form action={moderateDiscussion}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="decision" value="reject" /><button className="inline-flex items-center gap-1 rounded-full bg-[#fdeced] px-2.5 py-1 text-caption font-bold text-[#c43d4d]"><XCircle className="size-4" /> Reject</button></form></div>
                </div>
              ))}
              {!pendingRows.length ? <div className="px-4 py-8 text-center"><CheckCircle2 className="mx-auto size-5 text-mint-600" /><p className="mt-1.5 text-caption font-semibold text-ink">Queue is clear</p><p className="text-caption text-muted">No posts waiting for review.</p></div> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Marketplace" description="Active resident listings" icon={<ShoppingBag className="size-4" />} />
            <div className="border-t border-line">
              {classifiedRows.map(({ listing: l, seller }) => <div key={l.id} className="flex items-center gap-2 border-b border-line/70 px-4 py-2.5 last:border-0"><div className="min-w-0 flex-1"><p className="truncate text-caption font-semibold text-ink">{l.title}</p><p className="text-caption text-muted">{seller.name} · ₹{(l.price / 100).toLocaleString("en-IN")}</p></div><form action={removeClassified}><input type="hidden" name="id" value={l.id} /><button aria-label={`Remove listing: ${l.title}`} className="grid size-10 place-items-center rounded-lg text-caption text-muted hover:text-[#c43d4d]"><Trash2 className="size-4" /></button></form></div>)}
              {!classifiedRows.length ? <p className="px-4 py-5 text-center text-caption text-muted">No active listings.</p> : null}
            </div>
          </Card>

          <div className="rounded-[18px] bg-gradient-to-br from-brand-50 to-blush-50 p-4">
            <p className="text-caption font-semibold text-ink">Moderation guidelines</p>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-soft">Publish constructive posts. Reject personal attacks, commercial spam and anything that exposes a neighbour&apos;s private information. When in doubt, ask the author to revise.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
