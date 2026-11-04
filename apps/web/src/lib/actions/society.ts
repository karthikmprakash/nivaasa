"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, memberships, notifications, societies, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/queries";
import { randomBytes } from "node:crypto";

export type SocietyState = { error?: string; ok?: boolean; message?: string; tempPassword?: string };

export async function updateSocietyProfile(_prev: SocietyState, formData: FormData): Promise<SocietyState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  if (!name || !address || !city) return { error: "Name, address and city are required." };
  await db.update(societies).set({ name, address, city, state, pincode, registrationNo: String(formData.get("registrationNo") ?? "") || null, gstin: String(formData.get("gstin") ?? "") || null, pan: String(formData.get("pan") ?? "") || null, bankName: String(formData.get("bankName") ?? "") || null, bankAccount: String(formData.get("bankAccount") ?? "") || null, ifsc: String(formData.get("ifsc") ?? "") || null }).where(eq(societies.id, ctx.society.id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "society.profile.updated", entity: "society", entityId: ctx.society.id, metadata: { name, city, state }, createdAt: new Date() });
  for (const path of ["/admin/settings", "/admin", "/app", "/app/payments", "/gate", "/portfolio"]) revalidatePath(path);
  return { ok: true, message: "Society profile updated." };
}

export async function updateSocietyPreferences(_prev: SocietyState, formData: FormData): Promise<SocietyState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const current = ctx.society.settings ?? {};
  const number = (name: string, fallback: number, min: number, max: number) => {
    const value = Number(formData.get(name));
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  const gateway = String(formData.get("paymentGateway") ?? "demo");
  const settings = {
    ...current,
    visitorApproval: formData.get("visitorApproval") === "on",
    visitorPassTtlHours: number("visitorPassTtlHours", 24, 1, 168),
    discussionApproval: formData.get("discussionApproval") === "on",
    allowResidentClassifieds: formData.get("allowResidentClassifieds") === "on",
    lateFeePercent: number("lateFeePercent", 2, 0, 100),
    graceDays: number("graceDays", 5, 0, 90),
    helpdeskSlaHours: number("helpdeskSlaHours", 24, 1, 168),
    paymentGateway: (["demo", "razorpay", "stripe"].includes(gateway) ? gateway : "demo") as "demo" | "razorpay" | "stripe",
  };
  await db.update(societies).set({ settings }).where(eq(societies.id, ctx.society.id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "society.settings.updated", entity: "society", entityId: ctx.society.id, metadata: settings, createdAt: new Date() });
  for (const path of ["/admin/settings", "/admin", "/admin/billing", "/app", "/app/community", "/gate"]) revalidatePath(path);
  return { ok: true, message: "Community preferences saved." };
}

export async function changeTeamRole(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager"].includes(ctx.membership?.role ?? ""))) return;
  const membershipId = String(formData.get("membershipId") ?? "");
  const role = String(formData.get("role") ?? "");
  const allowed = ["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"];
  if (!allowed.includes(role)) return;
  const [membership] = await db.select().from(memberships).where(and(eq(memberships.id, membershipId), eq(memberships.societyId, ctx.society.id), eq(memberships.status, "active"))).limit(1);
  if (!membership || !["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(membership.role)) return;
  const actorIsAdmin = ctx.membership?.role === "admin" || ctx.user.globalRole === "super_admin";
  if (!actorIsAdmin && (membership.role === "admin" || role === "admin")) return;
  if (membership.role === "admin" && role !== "admin") {
    const admins = await db.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), eq(memberships.role, "admin"), eq(memberships.status, "active")));
    if (admins.length <= 1) return;
  }
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
  const roleValue = String(formData.get("role") ?? "committee");
  const allowedRoles = ["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"] as const;
  if (!allowedRoles.includes(roleValue as (typeof allowedRoles)[number])) return { error: "Choose a valid team role." };
  const role = roleValue as (typeof allowedRoles)[number];
  if (!name || !email || !phone) return { error: "Name, email and phone are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) return { error: "Enter a valid phone number." };

  // Existing Nivaasa accounts can join another society's team without a
  // duplicate account. Only a second membership in *this* society is rejected.
  const [existing] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    const [alreadyHere] = await db.select({ id: memberships.id, status: memberships.status }).from(memberships).where(and(eq(memberships.userId, existing.id), eq(memberships.societyId, ctx.society.id))).limit(1);
    if (alreadyHere) return { error: alreadyHere.status === "active" ? "This person is already on the team." : "This person already has a membership record here. Update that record instead of adding a duplicate." };
  }
  const [otherMembership] = existing ? await db.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, existing.id)).limit(1) : [];
  const isPrimary = !existing || !otherMembership;

  const tempPassword = existing ? null : `Nv-${randomBytes(4).toString("hex")}`;
  const userId = existing?.id ?? crypto.randomUUID();
  const displayName = existing?.name ?? name;
  const now = new Date();
  if (!existing) {
    await db.insert(users).values({ id: userId, name, email, phone, passwordHash: hashPassword(tempPassword!), avatarColor: "#3155d8", createdAt: now });
  }
  await db.insert(memberships).values({ id: crypto.randomUUID(), userId, societyId: ctx.society.id, unitId: null, role, designation: role.replace("_", " "), status: "active", isPrimary, joinedAt: now });
  await db.insert(notifications).values({
    id: crypto.randomUUID(), userId, societyId: ctx.society.id,
    title: `You're now a ${role.replace("_", " ")}`,
    body: `${ctx.user.name} added you to the ${ctx.society.name} team. Open the admin console to see your new permissions.`,
    type: "system", link: "/admin", createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: existing ? "team.member.linked" : "team.member.invited", entity: "membership", entityId: userId, metadata: { name: displayName, role }, createdAt: now });
  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: existing
      ? `${displayName} now has access to this society's console with their existing Nivaasa account.`
      : `${displayName} added to the team.`,
    tempPassword: tempPassword ?? undefined,
  };
}
