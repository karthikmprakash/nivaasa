"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, discussionComments, discussions, eventRsvps, events, memberships, notifications } from "@/db/schema";
import { requireResident, requireSession } from "@/lib/queries";

export type DiscussionState = { error?: string; fieldErrors?: Record<string, string> };

export async function createDiscussion(_prev: DiscussionState, formData: FormData): Promise<DiscussionState> {
  const ctx = await requireResident();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "general") as "general" | "suggestion" | "question" | "lost_found" | "safety";
  if (title.length < 6) return { fieldErrors: { title: "Give your post a clear title (at least 6 characters)." } };
  if (body.length < 10) return { fieldErrors: { body: "Add a little more detail so neighbours can respond." } };
  if (!["general", "suggestion", "question", "lost_found", "safety"].includes(category)) return { error: "Choose a valid category." };

  const needsApproval = ctx.society.settings?.discussionApproval ?? true;
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(discussions).values({
    id, societyId: ctx.society.id, authorId: ctx.user.id, title, body, category,
    status: needsApproval ? "pending" : "published", createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "discussion.created", entity: "discussion", entityId: id,
    metadata: { title, category, moderation: needsApproval }, createdAt: now,
  });
  revalidatePath("/app/community");
  revalidatePath("/admin/communications");
  redirect(`/app/community?tab=discussions&submitted=${needsApproval ? "moderation" : "published"}`);
}

export async function addDiscussionComment(formData: FormData) {
  const ctx = await requireResident();
  const discussionId = String(formData.get("discussionId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const [discussion] = await db.select().from(discussions).where(and(eq(discussions.id, discussionId), eq(discussions.societyId, ctx.society.id))).limit(1);
  if (!discussion || discussion.status !== "published") return;
  await db.insert(discussionComments).values({ id: crypto.randomUUID(), discussionId, authorId: ctx.user.id, body, createdAt: new Date() });
  revalidatePath(`/app/community/discussions/${discussionId}`);
  revalidatePath("/app/community");
}

export async function toggleEventRsvp(formData: FormData) {
  const ctx = await requireResident();
  const eventId = String(formData.get("eventId") ?? "");
  const guests = Math.max(0, Math.min(10, Number(formData.get("guests") ?? 0)));
  const [event] = await db.select().from(events).where(and(eq(events.id, eventId), eq(events.societyId, ctx.society.id))).limit(1);
  if (!event) return;
  const [existing] = await db.select().from(eventRsvps).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.userId, ctx.user.id))).limit(1);
  if (existing) {
    await db.delete(eventRsvps).where(eq(eventRsvps.id, existing.id));
  } else {
    await db.insert(eventRsvps).values({ id: crypto.randomUUID(), eventId, userId: ctx.user.id, guests, createdAt: new Date() });
  }
  revalidatePath("/app/community");
  revalidatePath("/app");
}

export async function markAllNotificationsRead() {
  const ctx = await requireSession();
  if (!ctx.society) return;
  const { notifications: notifTable } = await import("@/db/schema");
  const { isNull } = await import("drizzle-orm");
  await db.update(notifTable).set({ readAt: new Date() }).where(and(eq(notifTable.userId, ctx.user.id), eq(notifTable.societyId, ctx.society.id), isNull(notifTable.readAt)));
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}
