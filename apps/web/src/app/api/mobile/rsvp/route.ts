import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { eventRsvps, events } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ eventId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const [event] = await db.select().from(events).where(and(eq(events.id, parsed.data.eventId), eq(events.societyId, session.society.id))).limit(1);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const [existing] = await db.select().from(eventRsvps).where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.userId, session.user.id))).limit(1);
  if (existing) await db.delete(eventRsvps).where(eq(eventRsvps.id, existing.id));
  else await db.insert(eventRsvps).values({ id: crypto.randomUUID(), eventId: event.id, userId: session.user.id, guests: 0, createdAt: new Date() });
  return NextResponse.json({ ok: true, going: !existing });
}
