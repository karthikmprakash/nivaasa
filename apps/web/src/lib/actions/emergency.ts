"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, memberships, notifications, panicAlerts } from "@/db/schema";
import { requireResident } from "@/lib/queries";

export async function resolveMyAlert(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  const [alert] = await db.select().from(panicAlerts).where(and(
    eq(panicAlerts.id, id),
    eq(panicAlerts.userId, ctx.user.id),
    eq(panicAlerts.societyId, ctx.society.id),
  )).limit(1);
  if (!alert || alert.status === "resolved") return;
  const now = new Date();
  await db.update(panicAlerts).set({ status: "resolved", resolvedAt: now, resolvedBy: ctx.user.id }).where(eq(panicAlerts.id, alert.id));
  const responders = await db.select({ userId: memberships.userId }).from(memberships).where(and(
    eq(memberships.societyId, ctx.society.id),
    eq(memberships.status, "active"),
    inArray(memberships.role, ["guard", "security_manager", "admin", "manager"]),
  ));
  if (responders.length) await db.insert(notifications).values(responders.map((responder) => ({
    id: crypto.randomUUID(), userId: responder.userId, societyId: ctx.society.id,
    title: `Resident marked safe · Home ${ctx.unit.number}`,
    body: `${ctx.user.name} resolved their emergency alert.`,
    type: "security" as const, link: "/gate#alerts", createdAt: now,
  })));
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "panic.resolved_by_resident", entity: "panic_alert", entityId: alert.id,
    metadata: { message: alert.message }, createdAt: now,
  });
  revalidatePath("/app/emergency");
  revalidatePath("/gate");
  revalidatePath("/admin/security");
}
