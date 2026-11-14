import { NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushDevices } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { apnsConfigured } from "@/lib/push/apns";

const schema = z.object({
  token: z.string().regex(/^[a-fA-F0-9]{32,220}$/, "Invalid APNs token."),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  bundleId: z.string().max(160).optional(),
  deviceName: z.string().max(120).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [registered] = await db.select({ count: count() }).from(pushDevices).where(and(
    eq(pushDevices.userId, session.user.id),
    eq(pushDevices.societyId, session.society.id),
    isNull(pushDevices.revokedAt),
  ));
  return NextResponse.json({ configured: apnsConfigured(), devices: registered?.count ?? 0 });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push registration." }, { status: 400 });
  const now = new Date();
  const existing = await db.select({ id: pushDevices.id }).from(pushDevices).where(eq(pushDevices.token, parsed.data.token)).limit(1);
  if (existing[0]) {
    await db.update(pushDevices).set({
      userId: session.user.id,
      societyId: session.society.id,
      environment: parsed.data.environment,
      bundleId: parsed.data.bundleId ?? null,
      deviceName: parsed.data.deviceName ?? null,
      updatedAt: now,
      lastSeenAt: now,
      revokedAt: null,
    }).where(eq(pushDevices.id, existing[0].id));
  } else {
    await db.insert(pushDevices).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      societyId: session.society.id,
      token: parsed.data.token,
      platform: "ios",
      environment: parsed.data.environment,
      bundleId: parsed.data.bundleId ?? null,
      deviceName: parsed.data.deviceName ?? null,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
  }
  return NextResponse.json({ ok: true });
}
