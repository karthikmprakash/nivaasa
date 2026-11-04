import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, pollVotes, polls } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { canVoteInPollAudience, pollIsOpen } from "@/lib/community-access";

const schema = z.object({ pollId: z.string(), optionId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  const { pollId, optionId } = parsed.data;
  const [poll] = await db.select().from(polls).where(eq(polls.id, pollId)).limit(1);
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  if (poll.societyId !== session.membership?.societyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!pollIsOpen(poll.status, poll.endsAt)) return NextResponse.json({ error: "This poll has closed." }, { status: 409 });
  if (!poll.options.some((o) => o.id === optionId)) return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  if (!canVoteInPollAudience(session.membership?.role, poll.audience)) {
    return NextResponse.json({ error: "This poll is not open to your membership." }, { status: 403 });
  }
  const [existing] = await db.select().from(pollVotes).where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, session.user.id))).limit(1);
  if (existing) return NextResponse.json({ error: "You've already voted in this poll." }, { status: 409 });
  await db.insert(pollVotes).values({ id: crypto.randomUUID(), pollId, optionId, userId: session.user.id, unitId: session.membership.unitId, createdAt: new Date() });
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: poll.societyId, actorId: session.user.id, actorName: session.user.name,
    action: "poll.voted", entity: "poll", entityId: pollId, metadata: { optionId }, createdAt: new Date(),
  });
  revalidatePath("/app/community");
  revalidatePath("/app");
  revalidatePath("/admin/communications");
  return NextResponse.json({ ok: true });
}
