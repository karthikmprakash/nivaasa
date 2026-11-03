"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, memberships, societies, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/queries";
import { randomBytes } from "node:crypto";

export type SocietyState = { error?: string; ok?: boolean; message?: string; tempPassword?: string };

export async function updateSocietyProfile(_prev: SocietyState, formData: FormData): Promise<SocietyState> {
  const ctx = await requireAdmin();
  if (!ctx.society || !["admin", "manager"].includes(ctx.membership?.role ?? "")) return { error: "Permission denied." };
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  if (!name || !address || !city) return { error: "Name, address and city are required." };
  await db.update(societies).set({ name, address, city, state, pincode, registrationNo: String(formData.get("registrationNo") ?? "") || null, gstin: String(formData.get("gstin") ?? "") || null, pan: String(formData.get("pan") ?? "") || null, bankName: String(formData.get("bankName") ?? "") || null, bankAccount: String(formData.get("bankAccount") ?? "") || null, ifsc: String(formData.get("ifsc") ?? "") || null }).where(eq(societies.id, ctx.society.id));
  revalidatePath("/admin/settings");
  return { ok: true, message: "Society profile updated." };
}

export async function updateSocietyPreferences(_prev: SocietyState, formData: FormData): Promise<SocietyState> {
  const ctx = await requireAdmin();
  if (!ctx.society || !["admin", "manager"].includes(ctx.membership?.role ?? "")) return { error: "Permission denied." };
  const current = ctx.society.settings ?? {};
  const settings = {
    ...current,
    visitorApproval: formData.get("visitorApproval") === "on",
    visitorPassTtlHours: Math.max(1, Math.min(168, Number(formData.get("visitorPassTtlHours") ?? 24))),
    discussionApproval: formData.get("discussionApproval") === "on",
    allowResidentClassifieds: formData.get("allowResidentClassifieds") === "on",
    lateFeePercent: Math.max(0, Number(formData.get("lateFeePercent") ?? 0)),
    graceDays: Math.max(0, Number(formData.get("graceDays") ?? 5)),
    helpdeskSlaHours: Math.max(1, Number(formData.get("helpdeskSlaHours") ?? 24)),
    paymentGateway: String(formData.get("paymentGateway") ?? "demo") as "demo" | "razorpay" | "stripe",
  };
  await db.update(societies).set({ settings }).where(eq(societies.id, ctx.society.id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "society.settings.updated", entity: "society", entityId: ctx.society.id, metadata: settings, createdAt: new Date() });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Community preferences saved." };
}

export async function changeTeamRole(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society || !["admin", "manager"].includes(ctx.membership?.role ?? "")) return;
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  const allowed = ["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"];
  if (!allowed.includes(role)) return;
  const [membership] = await db.select().from(memberships).where(and(eq(memberships.id, membershipId), eq(memberships.societyId, ctx.society.id))).limit(1);
  if (!membership || !["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(membership.role)) return;
  await db.update(memberships).set({ role: role as typeof membership.role }).where(eq(memberships.id, membershipId));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "team.role.updated", entity: "membership", entityId: membershipId, metadata: { role }, createdAt: new Date() });
  revalidatePath("/admin/settings");
}

export async function inviteTeamMember(_prev: SocietyState, formData: FormData): Promise<SocietyState> {
  const ctx = await requireAdmin();
  if (!ctx.society || ctx.membership?.role !== "admin" && ctx.user.globalRole !== "super_admin") return { error: "Only a society admin can add team members." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "committee") as "admin" | "committee" | "manager" | "accountant" | "helpdesk_manager" | "security_manager" | "auditor";
  if (!name || !email || !phone) return { error: "Name, email and phone are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "A user with this email already exists." };
  const tempPassword = `Nv-${randomBytes(4).toString("hex")}`;
  const userId = crypto.randomUUID();
  const now = new Date();
  await db.insert(users).values({ id: userId, name, email, phone, passwordHash: hashPassword(tempPassword), avatarColor: "#3155d8", createdAt: now });
  await db.insert(memberships).values({ id: crypto.randomUUID(), userId, societyId: ctx.society.id, unitId: null, role, designation: role.replace("_", " "), status: "active", isPrimary: true, joinedAt: now });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "team.member.invited", entity: "membership", entityId: userId, metadata: { name, role }, createdAt: now });
  revalidatePath("/admin/settings");
  return { ok: true, message: `${name} added to the team.`, tempPassword };
}
