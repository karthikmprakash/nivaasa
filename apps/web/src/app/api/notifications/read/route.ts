import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (parsed.data.all) {
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, session.user.id), eq(notifications.societyId, session.membership.societyId), isNull(notifications.readAt)));
  } else if (parsed.data.id) {
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, parsed.data.id), eq(notifications.userId, session.user.id), eq(notifications.societyId, session.membership.societyId)));
  }
  return NextResponse.json({ ok: true });
}
