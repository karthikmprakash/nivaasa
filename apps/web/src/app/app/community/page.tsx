import { QueryTabs } from "@/components/ui/query-tabs";
import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import {
  ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Clock3, Heart, MapPin, MessageCircle,
  MessageSquare, Pin, Plus, Sparkles, Users, Vote, Info, PartyPopper, Megaphone,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { PollCard } from "@/components/app/poll-card";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { discussionComments, discussions, eventRsvps, events, notices, pollVotes, polls, users } from "@/db/schema";
import { toggleEventRsvp } from "@/lib/actions/community";
import { canVoteInPollAudience, noticeAudiencesForRole, pollAudiencesForRole, pollIsOpen } from "@/lib/community-access";
import { formatDate, formatTime, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };

export const dynamic = "force-dynamic";

const tabs = [
  { value: "all", label: "All updates" },
  { value: "notices", label: "Notices" },
  { value: "discussions", label: "Discussions" },
  { value: "polls", label: "Polls" },
  { value: "events", label: "Events" },
];

const categories: Record<string, { label: string; variant: "blue" | "pink" | "success" | "warning" | "purple" | "neutral" }> = {
  general: { label: "General", variant: "neutral" },
  maintenance: { label: "Maintenance", variant: "warning" },
  security: { label: "Security", variant: "purple" },
  event: { label: "Event", variant: "pink" },
  finance: { label: "Finance", variant: "success" },
};

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ tab?: string; submitted?: string; rsvp?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const tab = params.tab ?? "all";
  const societyId = ctx.society.id;
  const userId = ctx.user.id;

  const [noticeRows, discussionRows, pendingMine, commentCounts, pollRows, votes, myVotes, eventRows, rsvpCounts, myRsvps] = await Promise.all([
    db.select({ notice: notices, author: users }).from(notices).leftJoin(users, eq(notices.authorId, users.id)).where(and(eq(notices.societyId, societyId), inArray(notices.audience, noticeAudiencesForRole(ctx.membership.role)))).orderBy(desc(notices.pinned), desc(notices.publishedAt)),
    db.select({ discussion: discussions, author: users }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "published"))).orderBy(desc(discussions.pinned), desc(discussions.createdAt)),
    db.select({ discussion: discussions }).from(discussions).where(and(eq(discussions.societyId, societyId), eq(discussions.authorId, userId), eq(discussions.status, "pending"))).orderBy(desc(discussions.createdAt)),
    db.select({ discussionId: discussionComments.discussionId, c: count() }).from(discussionComments).groupBy(discussionComments.discussionId),
    db.select().from(polls).where(and(eq(polls.societyId, societyId), inArray(polls.audience, pollAudiencesForRole(ctx.membership.role)))).orderBy(desc(polls.createdAt)),
    db.select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, c: count() }).from(pollVotes).where(inArray(pollVotes.pollId, db.select({ id: polls.id }).from(polls).where(eq(polls.societyId, societyId)))).groupBy(pollVotes.pollId, pollVotes.optionId),
    db.select().from(pollVotes).where(eq(pollVotes.userId, userId)),
    db.select().from(events).where(and(eq(events.societyId, societyId), gte(events.startAt, new Date(Date.now() - 12 * 3600 * 1000)))).orderBy(events.startAt),
    db.select({ eventId: eventRsvps.eventId, c: count(), guests: sql<number>`coalesce(sum(${eventRsvps.guests}),0)` }).from(eventRsvps).groupBy(eventRsvps.eventId),
    db.select().from(eventRsvps).where(eq(eventRsvps.userId, userId)),
  ]);

  const commentsBy = new Map(commentCounts.map((c) => [c.discussionId, c.c]));
  const votesBy: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  for (const v of votes) {
    votesBy[v.pollId] ??= {};
    votesBy[v.pollId][v.optionId] = (votesBy[v.pollId][v.optionId] ?? 0) + v.c;
    totals[v.pollId] = (totals[v.pollId] ?? 0) + v.c;
  }
  const myVoteBy = new Map(myVotes.map((v) => [v.pollId, v.optionId]));
  const rsvpBy = new Map(rsvpCounts.map((r) => [r.eventId, { count: r.c, guests: r.guests }]));
  const myRsvpSet = new Set(myRsvps.map((r) => r.eventId));
  const featured = noticeRows.find((n) => n.notice.pinned) ?? noticeRows[0];
  const activePolls = pollRows.filter((p) => pollIsOpen(p.status, p.endsAt));

  return (
    <div>
      <PageHeader
        eyebrow="Your community"
        title="Community"
        description={`The private, moderated space for ${ctx.society.name}. Notices from the committee, conversations with neighbours, polls and everything coming up.`}
        actions={<Link href="/app/community/discussions/new" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-body font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"><Plus aria-hidden="true" className="size-4" /> <span>Start a discussion</span></Link>}
      />

      {params.submitted ? (
        <div className={`mt-5 flex items-start gap-3 rounded-2xl border p-4 ${params.submitted === "moderation" ? "border-amber-ink/20 bg-amber-soft" : "border-mint-600/20 bg-mint-50"}`}>
          {params.submitted === "moderation" ? <Clock3 className="mt-0.5 size-4 text-amber-ink" /> : <CheckCircle2 className="mt-0.5 size-4 text-mint-600" />}
          <div><p className="text-body font-semibold text-ink">{params.submitted === "moderation" ? "Your post is with the committee for review" : "Your discussion is live"}</p><p className="mt-0.5 text-caption text-ink-soft">{params.submitted === "moderation" ? "We'll publish it once a moderator approves it. You'll find it under your posts below." : "Your neighbours can now read and reply to it."}</p></div>
        </div>
      ) : null}
      {params.rsvp === "full" ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-ink/20 bg-amber-soft p-4">
          <Info className="mt-0.5 size-4 text-amber-ink" />
          <div><p className="text-body font-semibold text-ink">This event is full</p><p className="mt-0.5 text-caption text-ink-soft">The committee has reached the capacity for this event. Ask them about a waiting list or a future date.</p></div>
        </div>
      ) : null}

      <QueryTabs className="mt-5" label="Community sections" basePath="/app/community" value={tab} items={tabs} />

      {tab === "all" && featured ? (
        <Link href={`/app/community/notices/${featured.notice.id}`} className="group mt-5 block overflow-hidden rounded-[22px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-blush-50 p-5 transition-shadow hover:shadow-lift sm:p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm"><Megaphone className="size-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5"><Badge variant={categories[featured.notice.category]?.variant ?? "blue"}>{categories[featured.notice.category]?.label ?? "Notice"}</Badge>{featured.notice.pinned ? <Badge variant="pink"><Pin className="size-4" /> Pinned</Badge> : null}<span className="text-caption text-muted">{timeAgo(featured.notice.publishedAt)}</span></div>
              <h2 className="mt-1.5 text-body font-semibold leading-snug text-ink group-hover:text-brand-700">{featured.notice.title}</h2>
              <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted">{featured.notice.body.replace(/\n/g, " ")}</p>
              <p className="mt-1.5 text-caption text-muted">By {featured.author?.name ?? "Committee"} · {featured.notice.views} views</p>
            </div>
            <span className="ml-auto hidden size-9 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm sm:grid"><ArrowRight className="size-4" /></span>
          </div>
        </Link>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-5">
          {(tab === "all" || tab === "discussions") ? (
            <Card>
              <CardHeader title="Neighbourhood conversations" description="Questions, suggestions and the small things that build a community" icon={<MessageSquare className="size-4" />} action={<Link href="/app/community/discussions/new" className="text-caption font-semibold text-brand-600">Start a post</Link>} />
              <div className="border-t border-line">
                {discussionRows.slice(0, tab === "all" ? 3 : 10).map(({ discussion: d, author }) => (
                  <Link key={d.id} href={`/app/community/discussions/${d.id}`} className="group flex items-start gap-3 border-b border-line/70 px-5 py-4 last:border-0 hover:bg-[#fbfcff]">
                    <Avatar name={author.name} color={author.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><p className="text-caption font-semibold text-ink">{author.name}</p><span className="text-caption text-muted">· {timeAgo(d.createdAt)}</span>{d.pinned ? <Pin className="size-4 text-blush-500" /> : null}</div>
                      <p className="mt-1 text-body font-semibold leading-snug text-ink group-hover:text-brand-700">{d.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-caption leading-relaxed text-muted">{d.body}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-caption text-muted">
                        <span className="inline-flex items-center gap-1"><MessageCircle className="size-4" /> {commentsBy.get(d.id) ?? 0} replies</span>
                        <span className="inline-flex items-center gap-1"><Heart className="size-4" /> {d.likes}</span>
                        <Badge variant="outline" className="px-1.5 py-0.5 text-caption">{d.category.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <ChevronRight className="mt-2 size-4 shrink-0 text-[#c2c8d5]" />
                  </Link>
                ))}
                {pendingMine.length > 0 && tab === "discussions" ? pendingMine.map(({ discussion: d }) => (
                  <div key={d.id} className="flex items-start gap-3 border-b border-line/70 bg-amber-soft/30 px-5 py-4 last:border-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-soft text-amber-ink"><Clock3 className="size-4" /></span>
                    <div className="flex-1"><div className="flex items-center gap-2"><p className="text-caption font-semibold text-ink">Your post</p><Badge variant="warning">In review</Badge></div><p className="mt-1 text-body font-semibold text-ink">{d.title}</p><p className="mt-0.5 text-caption text-muted">Waiting for a moderator · {timeAgo(d.createdAt)}</p></div>
                  </div>
                )) : null}
              </div>
            </Card>
          ) : null}

          {(tab === "all" || tab === "notices") ? (
            <Card>
              <CardHeader title="Notices" description="Official updates from the committee" icon={<Megaphone className="size-4" />} />
              <div className="border-t border-line">
                {noticeRows.slice(0, tab === "all" ? 4 : 20).map(({ notice: n, author }) => {
                  const cat = categories[n.category] ?? categories.general;
                  return (
                    <Link key={n.id} href={`/app/community/notices/${n.id}`} className="group block border-b border-line/70 px-5 py-4 last:border-0 hover:bg-[#fbfcff]">
                      <div className="flex items-center gap-1.5"><Badge variant={cat.variant}>{cat.label}</Badge>{n.pinned ? <span className="text-caption font-bold uppercase tracking-wide text-blush-500">Pinned</span> : null}<span className="text-caption text-muted">{formatDate(n.publishedAt)}</span></div>
                      <p className="mt-1.5 text-body font-semibold leading-snug text-ink group-hover:text-brand-700">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-muted">{n.body.replace(/\n/g, " ")}</p>
                      <p className="mt-1.5 text-caption text-muted">By {author?.name ?? "Committee"} · {n.views} views</p>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {(tab === "all" || tab === "polls") ? (
            <div>
              <div className="mb-2.5 flex items-center justify-between"><h2 className="text-base font-semibold text-ink">Polls</h2><span className="text-caption text-muted">{activePolls.length} open</span></div>
              <div className="space-y-3">
                {pollRows.filter((p) => tab === "all" ? pollIsOpen(p.status, p.endsAt) : true).map((p) => {
                  const open = pollIsOpen(p.status, p.endsAt);
                  const canVote = open && canVoteInPollAudience(ctx.membership.role, p.audience);
                  return (
                    <PollCard key={p.id} pollId={p.id} question={p.question} description={p.description} options={p.options} counts={votesBy[p.id] ?? {}} total={totals[p.id] ?? 0} userVote={myVoteBy.get(p.id)} status={open ? "active" : "closed"} endsLabel={open && p.endsAt ? `Closes ${formatDate(p.endsAt)}` : "Closed"} audience={p.audience} secret={p.secret} hideResults={p.hideResults} canVote={canVote} />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Coming up" description="RSVP and add to your calendar" icon={<CalendarDays className="size-4" />} />
            <div className="border-t border-line">
              {eventRows.slice(0, tab === "events" ? 10 : 3).map((e) => {
                const going = rsvpBy.get(e.id);
                const mine = myRsvpSet.has(e.id);
                return (
                  <div key={e.id} className="border-b border-line/70 p-4 last:border-0">
                    <div className="flex gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blush-50 text-center">
                        <span className="text-caption font-bold uppercase text-blush-500">{formatDate(e.startAt, { month: "short" })}</span>
                        <span className="text-base font-bold leading-none text-ink">{new Date(e.startAt).getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-caption font-semibold leading-snug text-ink">{e.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-caption text-muted"><Clock3 className="size-4" /> {formatDate(e.startAt)} · {formatTime(e.startAt)}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-caption text-muted"><MapPin className="size-4" /> {e.location}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-caption text-muted">{going?.count ?? 0} going{going ? ` · ${going.guests + (going.count ?? 0)} people` : ""}</span>
                          <div className="flex items-center gap-1">
                            <a href={`/api/events/${e.id}/ics`} aria-label={`Add ${e.title} to calendar`} className="grid size-8 place-items-center rounded-full border border-line text-muted hover:border-brand-200 hover:text-brand-700"><CalendarPlus className="size-4" /></a>
                            <form action={toggleEventRsvp}><input type="hidden" name="eventId" value={e.id} /><button className={`rounded-full px-2.5 py-1 text-caption font-semibold ${mine ? "bg-mint-50 text-mint-600" : "bg-brand-600 text-white"}`}>{mine ? "Going ✓" : "RSVP"}</button></form>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-5">
            <div className="flex items-center gap-2"><Sparkles className="size-4 text-blush-500" /><p className="text-body font-semibold text-ink">A kind community</p></div>
            <p className="mt-2 text-caption leading-relaxed text-muted">Keep conversations respectful and useful. Personal disputes and commercial promotions belong in a private message or a classified, not the community feed.</p>
            <p className="mt-2 text-caption text-muted">Posts may be reviewed by the committee before publishing.</p>
          </div>

          <div className="rounded-[18px] bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <p className="text-caption font-semibold">Have something to sell?</p>
            <p className="mt-1 text-caption leading-relaxed text-white/80">List it in the community marketplace and reach every verified neighbour.</p>
            <Link href="/app/classifieds" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-caption font-bold text-brand-700">Open Buy & Sell <ArrowRight className="size-4" /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
