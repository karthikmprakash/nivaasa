"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, visitors } from "@/db/schema";
import { requireResident } from "@/lib/queries";
import { todayISO } from "@/lib/utils";
import { validatePassRequest } from "@/lib/visitor-pass-rules";
import { saveVisitorPass } from "@/lib/visitor-passes";

export type PreApproveState = { error?: string; fieldErrors?: Record<string, string> };

export async function createPreApproval(_prev: PreApproveState, formData: FormData): Promise<PreApproveState> {
  const ctx = await requireResident();
  const result = validatePassRequest({
    ...Object.fromEntries(formData),
    recurringCab: formData.get("recurringCab") === "daily",
    leaveAtGate: formData.get("leaveAtGate") === "on",
  }, todayISO());
  if (!result.pass) return { fieldErrors: result.fieldErrors, error: "Check the highlighted pass details." };
  const saved = saveVisitorPass(result.pass, { societyId: ctx.society.id, unitId: ctx.unit.id, userId: ctx.user.id, name: ctx.user.name });
  revalidatePath("/app");
  revalidatePath("/app/visitors");
  revalidatePath("/gate");
  redirect(`/app/visitors?tab=upcoming&created=${saved.id}`);
}

export async function cancelPreApproval(formData: FormData) {
  const ctx = await requireResident();
  const visitorId = String(formData.get("visitorId") ?? "");
  db.transaction((tx) => {
    const visitor = tx.update(visitors).set({ status: "expired" }).where(and(
      eq(visitors.id, visitorId), eq(visitors.unitId, ctx.unit.id), eq(visitors.societyId, ctx.society.id),
      eq(visitors.preApproved, true), eq(visitors.status, "approved"),
    )).returning({ name: visitors.name }).get();
    if (visitor) tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
      action: "visitor.pass.cancelled", entity: "visitor", entityId: visitorId,
      metadata: { visitor: visitor.name }, createdAt: new Date(),
    }).run();
  }, { behavior: "immediate" });
  revalidatePath("/app/visitors");
  revalidatePath("/gate");
}
