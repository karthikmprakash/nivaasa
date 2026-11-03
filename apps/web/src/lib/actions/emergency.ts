"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { panicAlerts } from "@/db/schema";
import { requireResident } from "@/lib/queries";

export async function resolveMyAlert(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.update(panicAlerts).set({ status: "resolved", resolvedAt: new Date(), resolvedBy: ctx.user.id }).where(and(eq(panicAlerts.id, id), eq(panicAlerts.userId, ctx.user.id), eq(panicAlerts.societyId, ctx.society.id)));
  revalidatePath("/app/emergency");
  revalidatePath("/gate");
  revalidatePath("/admin/security");
}
