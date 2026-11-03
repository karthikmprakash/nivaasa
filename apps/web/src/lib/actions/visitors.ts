"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, memberships, notifications, visitors } from "@/db/schema";
import { requireResident } from "@/lib/queries";
import { addDays, randomCode } from "@/lib/utils";

export type PreApproveState = { error?: string; fieldErrors?: Record<string, string> };

export async function createPreApproval(_prev: PreApproveState, formData: FormData): Promise<PreApproveState> {
  const ctx = await requireResident();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const type = String(formData.get("type") ?? "guest") as "guest" | "delivery" | "cab" | "domestic_help" | "vendor" | "other";
  const company = String(formData.get("company") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const vehicleNo = String(formData.get("vehicleNo") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const days = Math.min(30, Math.max(1, Number(formData.get("days") ?? 1)));
  const notes = String(formData.get("notes") ?? "").trim();
  const leaveAtGate = formData.get("leaveAtGate") === "on";

  if (!name) return { fieldErrors: { name: "Enter the visitor's name." } };
  if (phone && !/^[+\d][\d\s-]{6,}$/.test(phone)) return { fieldErrors: { phone: "Enter a valid phone number." } };
  if (!date) return { fieldErrors: { date: "Choose a start date." } };
  if (!["guest", "delivery", "cab", "domestic_help", "vendor", "other"].includes(type)) return { error: "Choose a visitor type." };

  const validFrom = new Date(`${date}T00:00:00`);
  if (Number.isNaN(validFrom.getTime())) return { fieldErrors: { date: "Choose a valid date." } };
  const validTo = addDays(validFrom, days);
  validTo.setHours(23, 59, 0, 0);

  let code = randomCode(6);
  for (let i = 0; i < 4; i++) {
    const [existing] = await db.select({ id: visitors.id }).from(visitors).where(and(eq(visitors.societyId, ctx.society.id), eq(visitors.code, code), inArray(visitors.status, ["approved", "pending"]))).limit(1);
    if (!existing) break;
    code = randomCode(6);
  }

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(visitors).values({
    id, societyId: ctx.society.id, unitId: ctx.unit.id, hostUserId: ctx.user.id,
    name, phone: phone || null, type, purpose: purpose || null, company: company || null,
    vehicleNo: vehicleNo || null, photoColor: "#e6ecff", status: "approved", code,
    leaveAtGate, preApproved: true, validFrom, validTo, approvedAt: now, approvedBy: ctx.user.id,
    notes: notes || null, createdAt: now,
  });

  const guards = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["guard", "security_manager"])));
  if (guards.length) {
    await db.insert(notifications).values(guards.map((g) => ({
      id: crypto.randomUUID(), userId: g.userId, societyId: ctx.society.id,
      title: "Pre-approved visitor added",
      body: `${ctx.user.name} pre-approved ${name}${company ? ` (${company})` : ""} for ${validFrom.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}${days > 1 ? ` – ${validTo.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}.`,
      type: "visitor" as const, link: "/gate", createdAt: now,
    })));
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "visitor.pass.created", entity: "visitor", entityId: id,
    metadata: { visitor: name, type, unit: ctx.unit.number, days }, createdAt: now,
  });

  revalidatePath("/app");
  revalidatePath("/app/visitors");
  revalidatePath("/gate");
  redirect(`/app/visitors?created=${code}&name=${encodeURIComponent(name)}`);
}

export async function cancelPreApproval(formData: FormData) {
  const ctx = await requireResident();
  const visitorId = String(formData.get("visitorId") ?? "");
  const [visitor] = await db.select().from(visitors).where(and(eq(visitors.id, visitorId), eq(visitors.unitId, ctx.unit.id))).limit(1);
  if (!visitor) return;
  await db.update(visitors).set({ status: "expired" }).where(eq(visitors.id, visitorId));
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "visitor.pass.cancelled", entity: "visitor", entityId: visitorId,
    metadata: { visitor: visitor.name }, createdAt: new Date(),
  });
  revalidatePath("/app/visitors");
  revalidatePath("/gate");
}
