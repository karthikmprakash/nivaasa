import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ token: z.string().min(32).max(220) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid device token." }, { status: 400 });
  await db.update(pushDevices).set({ revokedAt: new Date(), updatedAt: new Date() }).where(and(
    eq(pushDevices.token, parsed.data.token),
    eq(pushDevices.userId, session.user.id),
    eq(pushDevices.societyId, session.society.id),
  ));
  return NextResponse.json({ ok: true });
}
