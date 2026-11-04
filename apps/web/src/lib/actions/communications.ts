"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, classifieds, discussions, eventRsvps, events, memberships, notifications, notices, polls } from "@/db/schema";
import { requireAdmin } from "@/lib/queries";
import { filterRecipientsByPref, type NotificationPrefKey } from "@/lib/notifications";

export type CommsState = { error?: string; ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

async function residentsOf(societyId: string, pref: NotificationPrefKey) {
  const rows = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, societyId), inArray(memberships.role, ["owner", "tenant", "committee"]))).catch(() => []);
  return filterRecipientsByPref(societyId, rows, pref);
}

export async function publishNotice(_prev: CommsState, formData: FormData): Promise<CommsState> {
  const ctx = await requireAdmin();
  if (!ctx.society) return { error: "No society selected." };
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return { error: "You don't have permission for communications." };
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = String(formData.get("category") ?? "general") as "general" | "maintenance" | "security" | "event" | "finance" | "emergency";
  const audience = String(formData.get("audience") ?? "all") as "all" | "owners" | "tenants" | "tower";
  const pinned = formData.get("pinned") === "on";
  if (title.length < 5) return { fieldErrors: { title: "Add a clear title." } };
  if (body.length < 15) return { fieldErrors: { body: "Write a little more detail." } };
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(notices).values({ id, societyId: ctx.society.id, authorId: ctx.user.id, title, body, category, pinned, audience, publishedAt: now });
  const residents = await residentsOf(ctx.society.id, "community");
  if (residents.length) await db.insert(notifications).values(residents.map((r) => ({ id: crypto.randomUUID(), userId: r.userId, societyId: ctx.society!.id, title: `Notice: ${title}`, body: body.slice(0, 160), type: "notice" as const, link: `/app/community/notices/${id}`, createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "notice.published", entity: "notice", entityId: id, metadata: { title, category, audience, pinned }, createdAt: now });
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
  revalidatePath("/app");
  return { ok: true, message: "Notice published and residents notified." };
}

export async function deleteNotice(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  await db.delete(notices).where(and(eq(notices.id, id), eq(notices.societyId, ctx.society.id)));
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
}

export async function createPoll(_prev: CommsState, formData: FormData): Promise<CommsState> {
  const ctx = await requireAdmin();
  if (!ctx.society) return { error: "No society selected." };
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return { error: "You don't have permission for communications." };
  const question = String(formData.get("question") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const options = formData.getAll("option").map((o) => String(o).trim()).filter(Boolean);
  const audience = String(formData.get("audience") ?? "all") as "all" | "owners" | "tenants";
  const secret = formData.get("secret") === "on";
  const hideResults = formData.get("hideResults") === "on";
  const endsAt = String(formData.get("endsAt") ?? "");
  if (question.length < 8) return { fieldErrors: { question: "Add a clear poll question." } };
  if (options.length < 2) return { error: "Add at least two choices." };
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(polls).values({ id, societyId: ctx.society.id, authorId: ctx.user.id, question, description: description || null, options: options.map((label, i) => ({ id: `opt-${i + 1}-${Math.random().toString(36).slice(2, 6)}`, label })), audience, secret, hideResults, status: "active", endsAt: endsAt ? new Date(endsAt) : null, createdAt: now });
  const residents = await residentsOf(ctx.society.id, "community");
  if (residents.length) await db.insert(notifications).values(residents.map((r) => ({ id: crypto.randomUUID(), userId: r.userId, societyId: ctx.society!.id, title: "New community poll", body: question, type: "community" as const, link: "/app/community?tab=polls", createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "poll.created", entity: "poll", entityId: id, metadata: { question }, createdAt: now });
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
  return { ok: true, message: "Poll published." };
}

export async function closePoll(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  await db.update(polls).set({ status: "closed" }).where(and(eq(polls.id, id), eq(polls.societyId, ctx.society.id)));
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
}

export async function moderateDiscussion(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "publish") as "publish" | "reject" | "hide";
  const [d] = await db.select().from(discussions).where(and(eq(discussions.id, id), eq(discussions.societyId, ctx.society.id))).limit(1);
  if (!d) return;
  await db.update(discussions).set({ status: decision === "publish" ? "published" : decision === "reject" ? "rejected" : "hidden" }).where(eq(discussions.id, id));
  const [author] = await filterRecipientsByPref(ctx.society.id, [{ userId: d.authorId }], "community");
  if (author) await db.insert(notifications).values({ id: crypto.randomUUID(), userId: d.authorId, societyId: ctx.society.id, title: decision === "publish" ? "Your discussion is live" : "Your discussion was reviewed", body: decision === "publish" ? `“${d.title}” is now visible to the community.` : `A moderator reviewed “${d.title}” and it is not visible. Contact the community office if you have questions.`, type: "community", link: "/app/community?tab=discussions", createdAt: new Date() });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: `discussion.${decision}`, entity: "discussion", entityId: id, metadata: { title: d.title }, createdAt: new Date() });
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
}

export async function createEvent(_prev: CommsState, formData: FormData): Promise<CommsState> {
  const ctx = await requireAdmin();
  if (!ctx.society) return { error: "No society selected." };
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return { error: "You don't have permission for communications." };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startAt = String(formData.get("startAt") ?? "");
  const endAt = String(formData.get("endAt") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const capacity = Number(formData.get("capacity") ?? 0) || null;
  if (title.length < 4) return { fieldErrors: { title: "Add an event title." } };
  if (!startAt) return { fieldErrors: { startAt: "Choose a start date and time." } };
  if (!location) return { fieldErrors: { location: "Add a location." } };
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(events).values({ id, societyId: ctx.society.id, authorId: ctx.user.id, title, description, startAt: new Date(startAt), endAt: endAt ? new Date(endAt) : null, location, capacity, coverColor: "#fde8ef", createdAt: now });
  const residents = await residentsOf(ctx.society.id, "community");
  if (residents.length) await db.insert(notifications).values(residents.map((r) => ({ id: crypto.randomUUID(), userId: r.userId, societyId: ctx.society!.id, title: `You're invited: ${title}`, body: `${new Date(startAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} at ${location}. RSVP in the community tab.`, type: "community" as const, link: "/app/community?tab=events", createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "event.created", entity: "event", entityId: id, metadata: { title }, createdAt: now });
  revalidatePath("/admin/communications");
  revalidatePath("/app/community");
  return { ok: true, message: "Event published." };
}

export async function removeClassified(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  await db.update(classifieds).set({ status: "removed" }).where(and(eq(classifieds.id, id), eq(classifieds.societyId, ctx.society.id)));
  revalidatePath("/admin/communications");
  revalidatePath("/app/classifieds");
}
