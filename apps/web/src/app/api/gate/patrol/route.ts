import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, patrolCheckpoints, patrolRounds } from "@/db/schema";
import { gateSession } from "@/lib/gate";

const schema = z.object({ checkpointId: z.string(), notes: z.string().max(200).optional() });

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkpoint" }, { status: 400 });
  const [checkpoint] = await db.select().from(patrolCheckpoints).where(and(eq(patrolCheckpoints.id, parsed.data.checkpointId), eq(patrolCheckpoints.societyId, session.society!.id))).limit(1);
  if (!checkpoint) return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
  const now = new Date();
  await db.insert(patrolRounds).values({ id: crypto.randomUUID(), societyId: session.society!.id, guardId: session.user.id, checkpointId: checkpoint.id, status: "scanned", scannedAt: now, notes: parsed.data.notes || null });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id, actorName: session.user.name, action: "patrol.scanned", entity: "checkpoint", entityId: checkpoint.id, metadata: { checkpoint: checkpoint.name }, createdAt: now });
  revalidatePath("/gate"); revalidatePath("/admin/security");
  return NextResponse.json({ ok: true });
}
