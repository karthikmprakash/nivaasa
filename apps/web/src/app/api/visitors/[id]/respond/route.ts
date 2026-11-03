import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, deliveries, memberships, notifications, users, visitors } from "@/db/schema";
import { getSession, isAdminRole } from "@/lib/auth";

const schema = z.object({ action: z.enum(["approve", "deny", "leave_at_gate"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id)).limit(1);
  if (!visitor) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  if (visitor.status !== "pending") return NextResponse.json({ error: "This request has already been handled." }, { status: 409 });

  const role = session.membership?.role;
  const isResidentOfUnit = session.membership?.unitId === visitor.unitId;
  const canAct = isResidentOfUnit || session.user.globalRole === "super_admin" || (isAdminRole(role) && visitor.societyId === session.membership?.societyId);
  if (!canAct) return NextResponse.json({ error: "You can't act on this request." }, { status: 403 });

  const action = parsed.data.action;
  const now = new Date();
  const approved = action !== "deny";
  await db.update(visitors).set({
    status: approved ? "approved" : "denied",
    approvedAt: approved ? now : null,
    approvedBy: session.user.id,
    leaveAtGate: action === "leave_at_gate",
  }).where(eq(visitors.id, id));

  if (action === "leave_at_gate") {
    const [delivery] = await db.select().from(deliveries).where(and(eq(deliveries.unitId, visitor.unitId!), eq(deliveries.company, visitor.company ?? ""), eq(deliveries.status, "arrived"))).orderBy(desc(deliveries.createdAt)).limit(1);
    if (delivery) {
      await db.update(deliveries).set({ status: "left_at_gate", deliveredAt: now, notes: "Resident requested leave at gate", otp: visitor.code ?? delivery.otp }).where(eq(deliveries.id, delivery.id));
    }
  }

  // Tell the guards on duty.
  const guards = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, visitor.societyId), inArray(memberships.role, ["guard", "security_manager"])));
  if (guards.length) {
    await db.insert(notifications).values(guards.map((g) => ({
      id: crypto.randomUUID(), userId: g.userId, societyId: visitor.societyId,
      title: action === "deny" ? "Visitor denied entry" : action === "leave_at_gate" ? "Leave at gate requested" : "Visitor approved",
      body: `${session.user.name} ${action === "deny" ? "declined" : action === "leave_at_gate" ? "asked you to keep the delivery at the gate for" : "approved"} ${visitor.name}${visitor.company ? ` (${visitor.company})` : ""}.`,
      type: "visitor" as const, link: "/gate", createdAt: now,
    })));
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: visitor.societyId, actorId: session.user.id, actorName: session.user.name,
    action: `visitor.${action}`, entity: "visitor", entityId: visitor.id,
    metadata: { name: visitor.name, unit: visitor.unitId }, createdAt: now,
  });

  revalidatePath("/app");
  revalidatePath("/app/visitors");
  revalidatePath("/app/deliveries");
  revalidatePath("/gate");
  revalidatePath("/admin/security");
  return NextResponse.json({ ok: true });
}
