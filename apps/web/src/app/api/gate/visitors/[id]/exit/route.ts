import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditLogs, deliveries, visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await gateSession();
  if (!session?.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const now = new Date();
  const societyId = session.society.id;
  const exited = db.transaction((tx) => {
    const visitor = tx.update(visitors).set({ status: "exited", exitedAt: now })
      .where(and(eq(visitors.id, id), eq(visitors.societyId, societyId), eq(visitors.status, "entered"))).returning().get();
    if (!visitor) return false;
    if (visitor.type === "delivery" && visitor.code && visitor.unitId && !visitor.preApproved) {
      tx.update(deliveries).set({ status: "delivered", deliveredAt: now }).where(and(
        eq(deliveries.societyId, societyId), eq(deliveries.unitId, visitor.unitId),
        eq(deliveries.otp, visitor.code), eq(deliveries.status, "arrived"),
      )).run();
    }
    tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId, actorId: session.user.id, actorName: session.user.name,
      action: "visitor.exited", entity: "visitor", entityId: visitor.id,
      metadata: { name: visitor.name, unit: visitor.unitId }, createdAt: now,
    }).run();
    return true;
  }, { behavior: "immediate" });
  if (!exited) return NextResponse.json({ error: "This visitor is not currently checked in." }, { status: 409 });
  for (const path of ["/gate", "/admin/security", "/app/visitors", "/app/deliveries"]) revalidatePath(path);
  return NextResponse.json({ ok: true });
}
