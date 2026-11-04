import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { canViewNoticeAudience } from "@/lib/community-access";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.society || !session.membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [notice] = await db.select().from(notices).where(and(eq(notices.id, id), eq(notices.societyId, session.society.id))).limit(1);
  if (!notice || !canViewNoticeAudience(session.membership.role, notice.audience, notice.towerId, session.unit?.towerId)) {
    return NextResponse.json({ error: "Notice not found" }, { status: 404 });
  }
  await db.update(notices).set({ views: sql`${notices.views} + 1` }).where(eq(notices.id, id));
  return NextResponse.json({ ok: true });
}
