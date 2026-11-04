"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, helpdeskTickets, memberships, notifications, ticketComments, users } from "@/db/schema";
import { requireAdmin, requireResident } from "@/lib/queries";
import { filterRecipientsByPref } from "@/lib/notifications";
import { slaHoursForPriority } from "@/lib/helpdesk-sla";

export type TicketState = { error?: string; fieldErrors?: Record<string, string> };

const categories = ["Plumbing", "Electrical", "Lifts", "Housekeeping", "Security", "Parking", "Common areas", "Intercom", "Internet", "Other"];

async function notify(stakeholders: { userId: string }[], societyId: string, title: string, body: string, link: string) {
  const recipients = await filterRecipientsByPref(societyId, stakeholders, "helpdesk");
  if (!recipients.length) return;
  await db.insert(notifications).values(recipients.map((s) => ({ id: randomUUID(), userId: s.userId, societyId, title, body, type: "helpdesk" as const, link, createdAt: new Date() })));
}

async function savePhotos(files: File[]): Promise<string[]> {
  const saved: string[] = [];
  const dir = path.join(process.cwd(), "public", "uploads", "tickets");
  await fs.mkdir(dir, { recursive: true });
  for (const file of files.slice(0, 3)) {
    if (!file.size || file.size > 6 * 1024 * 1024) continue;
    if (!["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.type)) continue;
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const name = `${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    saved.push(`/uploads/tickets/${name}`);
  }
  return saved;
}

export async function createTicket(_prev: TicketState, formData: FormData): Promise<TicketState> {
  const ctx = await requireResident();
  const category = String(formData.get("category") ?? "");
  const scope = String(formData.get("scope") ?? "personal") as "personal" | "community";
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium") as "low" | "medium" | "high" | "urgent";
  if (!categories.includes(category)) return { fieldErrors: { category: "Choose a category." } };
  if (subject.length < 6) return { fieldErrors: { subject: "Add a short, clear subject." } };
  if (description.length < 15) return { fieldErrors: { description: "Describe the issue in a little more detail." } };
  if (!["low", "medium", "high", "urgent"].includes(priority)) return { error: "Choose a valid priority." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const attachments = await savePhotos(files);
  const hours = slaHoursForPriority(priority, ctx.society.settings?.helpdeskSlaHours ?? 24);
  const now = new Date();
  const id = randomUUID();
  await db.insert(helpdeskTickets).values({
    id, societyId: ctx.society.id, unitId: ctx.unit.id, raisedBy: ctx.user.id,
    category, scope, subject, description, attachments, priority, status: "open",
    slaDueAt: new Date(now.getTime() + hours * 3600 * 1000), createdAt: now, updatedAt: now,
  });
  const staff = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["helpdesk_manager", "manager", "admin"])));
  await notify(staff, ctx.society.id, "New helpdesk request", `${ctx.user.name} (${ctx.unit.number}) raised: ${subject}`, `/admin/helpdesk/${id}`);
  await db.insert(auditLogs).values({ id: randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "helpdesk.created", entity: "ticket", entityId: id, metadata: { subject, category, priority }, createdAt: now });
  revalidatePath("/app/helpdesk");
  revalidatePath("/admin/helpdesk");
  redirect(`/app/helpdesk/${id}?created=1`);
}

export async function addTicketComment(formData: FormData) {
  const ctx = await requireResident();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const [ticket] = await db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.societyId, ctx.society.id))).limit(1);
  if (!ticket || ticket.unitId !== ctx.unit.id) return;
  const now = new Date();
  await db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId: ctx.user.id, body, internal: false, createdAt: now });
  if (ticket.assigneeId) await notify([{ userId: ticket.assigneeId }], ctx.society.id, "New reply on a helpdesk request", `${ctx.user.name} replied on ${ticket.subject}.`, `/admin/helpdesk/${ticketId}`);
  revalidatePath(`/app/helpdesk/${ticketId}`);
}

export async function reopenTicket(formData: FormData) {
  const ctx = await requireResident();
  const ticketId = String(formData.get("ticketId") ?? "");
  const reason = String(formData.get("reason") ?? "The issue is not fully resolved.").trim();
  const [ticket] = await db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.unitId, ctx.unit.id))).limit(1);
  if (!ticket) return;
  const now = new Date();
  await db.update(helpdeskTickets).set({ status: "reopened", resolvedAt: null, reopenedCount: ticket.reopenedCount + 1, updatedAt: now, slaDueAt: new Date(now.getTime() + 24 * 3600 * 1000) }).where(eq(helpdeskTickets.id, ticketId));
  await db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId: ctx.user.id, body: `Reopened: ${reason}`, internal: false, createdAt: now });
  const staff = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["helpdesk_manager", "manager", "admin"])));
  await notify(staff, ctx.society.id, "A ticket was reopened", `${ctx.user.name} reopened: ${ticket.subject}.`, `/admin/helpdesk/${ticketId}`);
  revalidatePath(`/app/helpdesk/${ticketId}`);
  revalidatePath("/admin/helpdesk");
}

export async function rateTicket(formData: FormData) {
  const ctx = await requireResident();
  const ticketId = String(formData.get("ticketId") ?? "");
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating") ?? 0)));
  const feedback = String(formData.get("feedback") ?? "").trim();
  const [ticket] = await db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.unitId, ctx.unit.id))).limit(1);
  if (!ticket) return;
  await db.update(helpdeskTickets).set({ rating, feedback: feedback || null, status: "closed", updatedAt: new Date() }).where(eq(helpdeskTickets.id, ticketId));
  revalidatePath(`/app/helpdesk/${ticketId}`);
}

// ── Admin actions ─────────────────────────────────────────────────────────────
export async function adminUpdateTicket(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "helpdesk_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  const priority = String(formData.get("priority") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim();
  const allowedStatuses = ["open", "assigned", "in_progress", "resolved", "closed", "reopened"];
  const allowedPriorities = ["low", "medium", "high", "urgent"];
  const [ticket] = await db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.societyId, ctx.society.id))).limit(1);
  if (!ticket) return;
  const now = new Date();
  const updates: Partial<typeof helpdeskTickets.$inferInsert> = { updatedAt: now };
  if (allowedStatuses.includes(status)) updates.status = status as typeof ticket.status;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;
  if (allowedPriorities.includes(priority ?? "")) updates.priority = priority as typeof ticket.priority;
  if (status === "resolved" || status === "closed") updates.resolvedAt = now;
  if (status === "in_progress" && !ticket.assigneeId && assigneeId) updates.status = "in_progress";
  await db.update(helpdeskTickets).set(updates).where(eq(helpdeskTickets.id, ticketId));
  if (note) {
    await db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId: ctx.user.id, body: note, internal: false, createdAt: now });
  }
  const updateLabel = note || (allowedStatuses.includes(status) ? `Status changed to ${status.replaceAll("_", " ")}` : allowedPriorities.includes(priority ?? "") ? `Priority changed to ${priority}` : "Your request was updated");
  await notify([{ userId: ticket.raisedBy }], ctx.society.id, "Update on your helpdesk request", `${ctx.user.name}: ${updateLabel}`, `/app/helpdesk/${ticketId}`);
  await db.insert(auditLogs).values({ id: randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "helpdesk.updated", entity: "ticket", entityId: ticketId, metadata: { status, assigneeId, priority }, createdAt: now });
  revalidatePath("/admin/helpdesk");
  revalidatePath(`/admin/helpdesk/${ticketId}`);
  revalidatePath(`/app/helpdesk/${ticketId}`);
  revalidatePath("/app/helpdesk");
}

export async function adminAddComment(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "helpdesk_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const internal = formData.get("internal") === "on";
  if (!body) return;
  const [ticket] = await db.select().from(helpdeskTickets).where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.societyId, ctx.society.id))).limit(1);
  if (!ticket) return;
  const now = new Date();
  await db.insert(ticketComments).values({ id: randomUUID(), ticketId, authorId: ctx.user.id, body, internal, createdAt: now });
  await db.update(helpdeskTickets).set({ updatedAt: now }).where(eq(helpdeskTickets.id, ticketId));
  if (!internal) await notify([{ userId: ticket.raisedBy }], ctx.society.id, "New reply on your helpdesk request", body.slice(0, 180), `/app/helpdesk/${ticketId}`);
  revalidatePath(`/admin/helpdesk/${ticketId}`);
  revalidatePath(`/app/helpdesk/${ticketId}`);
}

export async function listAssignableUsers(societyId: string) {
  return db.select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(users.name);
}
