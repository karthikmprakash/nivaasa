"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { todayISO } from "@/lib/utils";
import { db } from "@/db";
import { auditLogs, panicAlerts } from "@/db/schema";
import { requireAdmin } from "@/lib/queries";

export async function handlePanicAlert(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "security_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "resolve");
  if (!["acknowledge", "resolve"].includes(action)) return;
  const [alert] = await db.select().from(panicAlerts).where(and(eq(panicAlerts.id, id), eq(panicAlerts.societyId, ctx.society.id))).limit(1);
  if (!alert || alert.status === "resolved") return;
  const now = new Date();
  await db.update(panicAlerts).set({ status: action === "acknowledge" ? "acknowledged" : "resolved", resolvedAt: action === "acknowledge" ? null : now, resolvedBy: ctx.user.id }).where(eq(panicAlerts.id, id));
  if (alert.userId) await db.insert(notifications).values({
    id: crypto.randomUUID(), userId: alert.userId, societyId: ctx.society.id,
    title: action === "acknowledge" ? "Security acknowledged your alert" : "Your emergency alert was resolved",
    body: action === "acknowledge" ? `${ctx.user.name} is responding to your alert.` : "The community team has closed the alert. Contact the office if you still need help.",
    type: "security", link: "/app/emergency", createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: `panic.${action}`, entity: "panic_alert", entityId: id, metadata: { message: alert.message }, createdAt: now });
  revalidatePath("/admin/security");
  revalidatePath("/gate");
  revalidatePath("/app/emergency");
}

import { hashPassword } from "@/lib/password";
import { memberships, moveRequests, notifications, units, users } from "@/db/schema";
import { randomBytes } from "node:crypto";

export type AdminState = { error?: string; ok?: boolean; message?: string; tempPassword?: string };

export async function handleMoveRequest(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "approve");
  if (!["approve", "reject"].includes(decision)) return;
  const [request] = await db.select().from(moveRequests).where(and(eq(moveRequests.id, id), eq(moveRequests.societyId, ctx.society.id))).limit(1);
  if (!request || request.status !== "pending") return;
  const now = new Date();
  await db.update(moveRequests).set({ status: decision === "approve" ? "approved" : "rejected", decidedBy: ctx.user.id }).where(eq(moveRequests.id, id));
  await db.insert(notifications).values({
    id: crypto.randomUUID(), userId: request.userId, societyId: ctx.society.id,
    title: decision === "approve" ? "Move request approved" : "Move request needs attention",
    body: decision === "approve" ? `Your ${request.type.replace("_", " ")} on ${request.date} has been approved. Please collect gate passes for the movers from the community office.` : `Your ${request.type.replace("_", " ")} request on ${request.date} was not approved. The committee will contact you with next steps.`,
    type: "system" as const, link: "/app/my-home", createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: `move.${decision}d`, entity: "move_request", entityId: id, metadata: { date: request.date }, createdAt: now });
  revalidatePath("/admin/residents");
  revalidatePath("/app/my-home");
}

export async function addResident(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx.society) return { error: "No society selected." };
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return { error: "You don't have permission to add residents." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const unitId = String(formData.get("unitId") ?? "");
  const roleValue = String(formData.get("role") ?? "owner");
  if (!["owner", "tenant", "committee"].includes(roleValue)) return { error: "Choose a valid residency type." };
  const role = roleValue as "owner" | "tenant" | "committee";
  if (!name || !email || !phone) return { error: "Name, email and phone are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) return { error: "Enter a valid phone number." };
  const [unit] = await db.select().from(units).where(and(eq(units.id, unitId), eq(units.societyId, ctx.society.id))).limit(1);
  if (!unit) return { error: "Choose a valid home." };
  const [occupied] = await db.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.unitId, unitId), eq(memberships.status, "active"))).limit(1);
  if (occupied) return { error: "This home already has an active resident. Use the household page to add a family member." };

  // A Nivaasa account can belong to more than one society. Reuse the account
  // and add a membership instead of rejecting a familiar email.
  const [existing] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    const [alreadyHere] = await db.select({ id: memberships.id, status: memberships.status }).from(memberships).where(and(eq(memberships.userId, existing.id), eq(memberships.societyId, ctx.society.id))).limit(1);
    if (alreadyHere) return { error: alreadyHere.status === "active" ? "This person is already a member of this society." : "This person already has a membership record here. Update that record instead of adding a duplicate." };
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
  await db.insert(memberships).values({ id: crypto.randomUUID(), userId, societyId: ctx.society.id, unitId, role, designation: role === "committee" ? "Committee member" : null, status: "active", isPrimary, joinedAt: now });
  await db.update(units).set({ status: "occupied", ownership: role === "tenant" ? "tenanted" : "owner_occupied" }).where(eq(units.id, unitId));
  await db.insert(notifications).values({
    id: crypto.randomUUID(), userId, societyId: ctx.society.id, title: `Welcome to ${ctx.society.name}`,
    body: existing
      ? `${ctx.user.name} added your existing Nivaasa account to ${ctx.society.name}. Sign in with your current password to open Home ${unit.number}.`
      : `Your account was created by ${ctx.user.name}. Sign in with your email and the temporary password shared by the community office.`,
    type: "system", link: "/app", createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: existing ? "resident.linked" : "resident.created", entity: "membership", entityId: userId, metadata: { name: displayName, unit: unit.number, role }, createdAt: now });
  revalidatePath("/admin/residents");
  revalidatePath("/app/directory");
  return {
    ok: true,
    message: existing
      ? `${displayName} now has access to Home ${unit.number} with their existing Nivaasa account.`
      : `${displayName} added to Home ${unit.number}.`,
    tempPassword: tempPassword ?? undefined,
  };
}

import { amenities, amenityBookings, payments } from "@/db/schema";

export async function createAmenity(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager", "committee"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter an amenity name." };
  const openTime = String(formData.get("openTime") ?? "06:00");
  const closeTime = String(formData.get("closeTime") ?? "22:00");
  const slotMinutes = Math.max(15, Math.floor(Number(formData.get("slotMinutes") ?? 60) || 60));
  if (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime) || (slotMinutes < 1440 && closeTime <= openTime)) {
    return { error: slotMinutes >= 1440 ? "Choose valid opening and closing times." : "Closing time must be after opening time." };
  }
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  if (slotMinutes < 1440 && slotMinutes > closeMinutes - openMinutes) {
    return { error: "The slot length is longer than the amenity's opening hours." };
  }
  await db.insert(amenities).values({
    id: crypto.randomUUID(), societyId: ctx.society.id, name,
    description: String(formData.get("description") ?? "") || null,
    icon: String(formData.get("icon") ?? "sparkles"), location: String(formData.get("location") ?? "") || null,
    capacity: Math.max(1, Math.floor(Number(formData.get("capacity") ?? 10) || 10)), slotMinutes,
    price: Math.max(0, Math.round((Number(formData.get("price") ?? 0) || 0) * 100)), deposit: Math.max(0, Math.round((Number(formData.get("deposit") ?? 0) || 0) * 100)),
    openTime, closeTime,
    rules: String(formData.get("rules") ?? "") || null, active: true, sortOrder: 99,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "amenity.created", entity: "amenity", metadata: { name }, createdAt: new Date() });
  revalidatePath("/admin/amenities");
  revalidatePath("/app/amenities");
  return { ok: true, message: `${name} added.` };
}

export async function toggleAmenity(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const [a] = await db.select().from(amenities).where(and(eq(amenities.id, id), eq(amenities.societyId, ctx.society.id))).limit(1);
  if (!a) return;
  await db.update(amenities).set({ active: !a.active }).where(eq(amenities.id, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "amenity.active.updated", entity: "amenity", entityId: id, metadata: { name: a.name, active: !a.active }, createdAt: new Date() });
  revalidatePath("/admin/amenities");
  revalidatePath("/app/amenities");
}

export async function adminCancelBooking(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "committee"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const [booking] = await db.select().from(amenityBookings).where(and(eq(amenityBookings.id, id), eq(amenityBookings.societyId, ctx.society.id))).limit(1);
  if (!booking || booking.status !== "confirmed") return;
  await db.update(amenityBookings).set({ status: "cancelled", paymentStatus: booking.paymentId ? "refunded" : booking.paymentStatus }).where(eq(amenityBookings.id, id));
  if (booking.paymentId) await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, booking.paymentId));
  await db.insert(notifications).values({ id: crypto.randomUUID(), userId: booking.userId, societyId: ctx.society.id, title: "Amenity booking cancelled", body: `The committee cancelled your booking on ${booking.date} (${booking.startTime}–${booking.endTime}).${booking.paymentId ? " The amount has been refunded." : ""}`, type: "amenity", link: "/app/amenities", createdAt: new Date() });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "amenity.booking.cancelled_by_admin", entity: "booking", entityId: id, metadata: { date: booking.date, unit: booking.unitId }, createdAt: new Date() });
  revalidatePath("/admin/amenities");
  revalidatePath("/app/amenities");
}

import { staff } from "@/db/schema";
import { recordStaffAttendance } from "@/lib/staff-attendance";

export async function addStaffMember(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager", "security_manager"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const kindValue = String(formData.get("kind") ?? "society");
  if (!["society", "security", "daily_help"].includes(kindValue)) return { error: "Choose a valid staff group." };
  const kind = kindValue as "society" | "security" | "daily_help";
  const phone = String(formData.get("phone") ?? "").trim();
  const monthlyRate = Number(formData.get("monthlyRate") ?? 0);
  if (!name || !role) return { error: "Name and role are required." };
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) return { error: "Enter a valid monthly pay." };
  await db.insert(staff).values({ id: crypto.randomUUID(), societyId: ctx.society.id, name, kind, role, phone, shift: String(formData.get("shift") ?? "") || null, monthlyRate: monthlyRate > 0 ? Math.round(monthlyRate * 100) : null, idType: "Aadhaar", photoColor: "#4f6d8f", policeVerified: false, active: true, joinedAt: new Date() });
  revalidatePath("/admin/staff");
  return { ok: true, message: `${name} added to the team.` };
}

export async function toggleStaffVerification(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "security_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const [s] = await db.select().from(staff).where(and(eq(staff.id, id), eq(staff.societyId, ctx.society.id))).limit(1);
  if (!s) return;
  await db.update(staff).set({ policeVerified: !s.policeVerified }).where(eq(staff.id, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "staff.verification.updated", entity: "staff", entityId: id, metadata: { name: s.name, verified: !s.policeVerified }, createdAt: new Date() });
  revalidatePath("/admin/staff");
  revalidatePath("/gate");
}

export async function toggleStaffActive(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "security_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const id = String(formData.get("id") ?? "");
  const [s] = await db.select().from(staff).where(and(eq(staff.id, id), eq(staff.societyId, ctx.society.id))).limit(1);
  if (!s) return;
  await db.update(staff).set({ active: !s.active }).where(eq(staff.id, id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "staff.active.updated", entity: "staff", entityId: id, metadata: { name: s.name, active: !s.active }, createdAt: new Date() });
  revalidatePath("/admin/staff");
}

export async function markStaffAttendance(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society) return;
  if (!["admin", "manager", "security_manager"].includes(ctx.membership?.role ?? "") && ctx.user.globalRole !== "super_admin") return;
  const staffId = String(formData.get("staffId") ?? "");
  const action = formData.get("action") === "out" ? "out" : "in";
  recordStaffAttendance(ctx.society.id, ctx.user.id, staffId, action);
  for (const path of ["/admin/staff", "/gate", "/app/my-home", "/app/visitors"]) revalidatePath(path);
}

import { assets, vendors } from "@/db/schema";
import { addVendor } from "@/lib/actions/billing";

export async function addAsset(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager", "accountant", "committee"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  const value = Number(formData.get("value") ?? 0);
  if (!name) return { error: "Enter an asset name." };
  if (!Number.isFinite(quantity) || quantity < 1) return { error: "Enter a valid quantity." };
  if (!Number.isFinite(value) || value < 0) return { error: "Enter a valid asset value." };
  const conditionValue = String(formData.get("condition") ?? "good");
  if (!["good", "needs_service", "retired"].includes(conditionValue)) return { error: "Choose a valid asset condition." };
  const amcVendorId = String(formData.get("amcVendorId") ?? "") || null;
  if (amcVendorId) {
    const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, amcVendorId), eq(vendors.societyId, ctx.society.id))).limit(1);
    if (!vendor) return { error: "Choose a vendor from this society." };
  }
  await db.insert(assets).values({ id: crypto.randomUUID(), societyId: ctx.society.id, name, category: String(formData.get("category") ?? "General"), location: String(formData.get("location") ?? "") || null, quantity: Math.max(1, Math.floor(quantity)), purchaseDate: String(formData.get("purchaseDate") ?? "") || null, value: Math.round(value * 100), amcVendorId, amcDue: String(formData.get("amcDue") ?? "") || null, condition: conditionValue as "good" | "needs_service" | "retired" });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action: "asset.created", entity: "asset", metadata: { name, category: String(formData.get("category") ?? "General"), value }, createdAt: new Date() });
  revalidatePath("/admin/vendors");
  return { ok: true, message: `${name} added to the asset register.` };
}
