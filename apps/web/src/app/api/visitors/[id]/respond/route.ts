import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, deliveries, memberships, notifications, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ action: z.enum(["approve", "deny", "leave_at_gate"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const { action } = parsed.data;
  const now = new Date();

  const result = db.transaction((tx) => {
    const visitor = tx.select().from(visitors).where(eq(visitors.id, id)).get();
    if (!visitor) return { error: "Visitor not found.", status: 404 };
    const sameSociety = session.membership?.societyId === visitor.societyId;
    const resident = sameSociety && !!visitor.unitId && session.membership?.unitId === visitor.unitId;
    const security = sameSociety && ["admin", "manager", "security_manager"].includes(session.membership?.role ?? "");
    if (!resident && !security && session.user.globalRole !== "super_admin") return { error: "You can’t act on this request.", status: 403 };
    if (visitor.status !== "pending") return { error: "This request has already been handled.", status: 409 };
    const leaveAtGate = action === "leave_at_gate";
    if (leaveAtGate && visitor.type !== "delivery") return { error: "Only deliveries can be left at the gate.", status: 400 };

    tx.update(visitors).set({
      status: action === "deny" ? "denied" : leaveAtGate ? "exited" : "approved",
      approvedAt: action === "deny" ? null : now, approvedBy: session.user.id, leaveAtGate,
      exitedAt: leaveAtGate ? now : null,
    }).where(eq(visitors.id, id)).run();

    if (visitor.type === "delivery" && visitor.unitId && action !== "approve") {
      const delivery = visitor.code ? tx.select({ id: deliveries.id }).from(deliveries).where(and(
        eq(deliveries.societyId, visitor.societyId), eq(deliveries.unitId, visitor.unitId),
        eq(deliveries.otp, visitor.code), eq(deliveries.status, "arrived"),
      )).get() : undefined;
      if (leaveAtGate) {
        const update = { status: "left_at_gate" as const, otp: String(randomInt(1_000_000)).padStart(6, "0"), notes: "Resident requested leave at gate" };
        if (delivery) tx.update(deliveries).set(update).where(eq(deliveries.id, delivery.id)).run();
        else tx.insert(deliveries).values({
          ...update, id: crypto.randomUUID(), societyId: visitor.societyId, unitId: visitor.unitId,
          hostUserId: visitor.hostUserId, guardId: visitor.guardId, company: visitor.company || "Delivery", courierName: visitor.name, createdAt: now,
        }).run();
      } else if (delivery) tx.update(deliveries).set({ status: "returned" }).where(eq(deliveries.id, delivery.id)).run();
    }

    const guards = tx.select({ userId: memberships.userId }).from(memberships).where(and(
      eq(memberships.societyId, visitor.societyId), eq(memberships.status, "active"), inArray(memberships.role, ["guard", "security_manager"]),
    )).all();
    if (guards.length) tx.insert(notifications).values(guards.map(({ userId }) => ({
      id: crypto.randomUUID(), userId, societyId: visitor.societyId,
      title: action === "deny" ? "Visitor denied entry" : leaveAtGate ? "Keep parcel at the gate" : "Visitor approved",
      body: `${session.user.name} ${action === "deny" ? "declined" : leaveAtGate ? "asked you to keep the delivery at the gate for" : "approved"} ${visitor.name}.`,
      type: "visitor" as const, link: leaveAtGate ? "/gate#deliveries" : "/gate#queue", createdAt: now,
    }))).run();
    tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId: visitor.societyId, actorId: session.user.id, actorName: session.user.name,
      action: `visitor.${action}`, entity: "visitor", entityId: visitor.id,
      metadata: { name: visitor.name, unit: visitor.unitId }, createdAt: now,
    }).run();
    return { ok: true } as const;
  }, { behavior: "immediate" });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  for (const path of ["/app", "/app/visitors", "/app/deliveries", "/gate", "/admin/security"]) revalidatePath(path);
  return NextResponse.json(result);
}
