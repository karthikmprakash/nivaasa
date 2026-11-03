import { NextResponse } from "next/server";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { discussionComments, discussions, eventRsvps, events, notices, pollVotes, polls, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const societyId = session.society.id;
  const [noticeRows, discussionRows, commentCounts, pollRows, voteRows, myVotes, eventRows, rsvpRows, myRsvps] = await Promise.all([
    db.select({ notice: notices, author: users.name }).from(notices).leftJoin(users, eq(notices.authorId, users.id)).where(and(eq(notices.societyId, societyId), eq(notices.audience, "all"))).orderBy(desc(notices.pinned), desc(notices.publishedAt)).limit(20),
    db.select({ discussion: discussions, author: users.name, color: users.avatarColor }).from(discussions).innerJoin(users, eq(discussions.authorId, users.id)).where(and(eq(discussions.societyId, societyId), eq(discussions.status, "published"))).orderBy(desc(discussions.createdAt)).limit(20),
    db.select({ id: discussionComments.discussionId, c: count() }).from(discussionComments).groupBy(discussionComments.discussionId),
    db.select().from(polls).where(eq(polls.societyId, societyId)).orderBy(desc(polls.createdAt)).limit(10),
    db.select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, c: count() }).from(pollVotes).where(inArray(pollVotes.pollId, db.select({ id: polls.id }).from(polls).where(eq(polls.societyId, societyId)))).groupBy(pollVotes.pollId, pollVotes.optionId),
    db.select().from(pollVotes).where(eq(pollVotes.userId, session.user.id)),
    db.select().from(events).where(and(eq(events.societyId, societyId), gte(events.startAt, new Date()))).orderBy(events.startAt).limit(10),
    db.select({ eventId: eventRsvps.eventId, c: count() }).from(eventRsvps).groupBy(eventRsvps.eventId),
    db.select().from(eventRsvps).where(eq(eventRsvps.userId, session.user.id)),
  ]);
  const commentBy = new Map(commentCounts.map((c) => [c.id, c.c]));
  const counts: Record<string, Record<string, number>> = {};
  for (const v of voteRows) { counts[v.pollId] ??= {}; counts[v.pollId][v.optionId] = v.c; }
  const myVote = new Map(myVotes.map((v) => [v.pollId, v.optionId]));
  return NextResponse.json({
    notices: noticeRows.map((n) => ({ ...n.notice, author: n.author })),
    discussions: discussionRows.map((d) => ({ ...d.discussion, author: d.author, color: d.color, replies: commentBy.get(d.discussion.id) ?? 0 })),
    polls: pollRows.map((p) => ({ ...p, counts: counts[p.id] ?? {}, total: Object.values(counts[p.id] ?? {}).reduce((s, n) => s + n, 0), myVote: myVote.get(p.id) ?? null })),
    events: eventRows,
    rsvps: rsvpRows,
    myRsvps: myRsvps.map((r) => r.eventId),
  });
}
