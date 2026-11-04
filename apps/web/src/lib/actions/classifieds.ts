"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, classifieds } from "@/db/schema";
import { requireResident } from "@/lib/queries";

export type ClassifiedState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

export async function createClassified(_prev: ClassifiedState, formData: FormData): Promise<ClassifiedState> {
  const ctx = await requireResident();
  if (!(ctx.society.settings?.allowResidentClassifieds ?? true)) return { error: "Classifieds are currently disabled for this community." };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryValue = String(formData.get("category") ?? "other");
  const conditionValue = String(formData.get("condition") ?? "good");
  if (!["furniture", "electronics", "vehicles", "kids", "home", "services", "other"].includes(categoryValue)) return { error: "Choose a category." };
  if (!["new", "like_new", "good", "used"].includes(conditionValue)) return { error: "Choose a valid condition." };
  const category = categoryValue as "furniture" | "electronics" | "vehicles" | "kids" | "home" | "services" | "other";
  const condition = conditionValue as "new" | "like_new" | "good" | "used";
  const price = Math.max(0, Math.round(Number(formData.get("price") ?? 0)));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (title.length < 4) return { fieldErrors: { title: "Add a clear title." } };
  if (description.length < 10) return { fieldErrors: { description: "Add a little more detail." } };
  if (!["furniture", "electronics", "vehicles", "kids", "home", "services", "other"].includes(category)) return { error: "Choose a category." };
  if (!Number.isFinite(price)) return { fieldErrors: { price: "Enter a valid price." } };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { fieldErrors: { imageUrl: "Use a valid http(s) image URL." } };
  const id = crypto.randomUUID();
  await db.insert(classifieds).values({ id, societyId: ctx.society.id, sellerId: ctx.user.id, title, description, category, price: Math.round(price * 100), condition, status: "active", imageUrl: imageUrl || null, createdAt: new Date() });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "classified.created", entity: "classified", entityId: id, metadata: { title, price }, createdAt: new Date() });
  revalidatePath("/app/classifieds");
  return { ok: true };
}

export async function markClassifiedSold(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.update(classifieds).set({ status: "sold" }).where(and(eq(classifieds.id, id), eq(classifieds.sellerId, ctx.user.id)));
  revalidatePath("/app/classifieds");
}

export async function deleteClassified(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.delete(classifieds).where(and(eq(classifieds.id, id), eq(classifieds.sellerId, ctx.user.id)));
  revalidatePath("/app/classifieds");
}
