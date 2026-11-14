import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ visitorId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.membership?.unitId || !session.society || !["owner", "tenant", "family", "committee"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Resident access required." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a pass to cancel." }, { status: 400 });

  const [pass] = await db.select().from(visitors).where(and(
    eq(visitors.id, parsed.data.visitorId),
    eq(visitors.unitId, session.membership.unitId),
    eq(visitors.societyId, session.society.id),
  )).limit(1);
  if (!pass || !pass.preApproved) return NextResponse.json({ error: "Pass not found." }, { status: 404 });
  if (pass.status !== "approved" || (pass.validTo && pass.validTo < new Date())) {
    return NextResponse.json({ error: "This pass is no longer active." }, { status: 409 });
  }
  if (pass.status === "approved") {
    await db.transaction(tx => {
      tx.update(visitors).set({ status: "expired" }).where(eq(visitors.id, pass.id)).run();
      tx.insert(auditLogs).values({
        id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id,
        actorName: session.user.name, action: "visitor.pass.cancelled", entity: "visitor",
        entityId: pass.id, metadata: { visitor: pass.name, type: pass.type }, createdAt: new Date(),
      }).run();
    });
  }
  revalidatePath("/app/visitors");
  revalidatePath("/gate");
  return NextResponse.json({ ok: true });
}
