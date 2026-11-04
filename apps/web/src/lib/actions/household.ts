"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs, dailyHelpReviews, familyMembers, memberships, moveRequests, notifications, pets, staff, units, users, vehicles,
} from "@/db/schema";
import { requireResident } from "@/lib/queries";
import { phoneKey, validVisitorPhone } from "@/lib/visitor-pass-rules";

export type HouseholdState = { error?: string; ok?: boolean; message?: string };

async function audit(ctx: Awaited<ReturnType<typeof requireResident>>, action: string, entity: string, entityId: string, metadata?: Record<string, unknown>) {
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: ctx.society.id, actorId: ctx.user.id, actorName: ctx.user.name, action, entity, entityId, metadata, createdAt: new Date() });
}

export async function updateContacts(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const primary = String(formData.get("intercomPrimary") ?? "").trim();
  const secondary = String(formData.get("intercomSecondary") ?? "").trim();
  const emergencyName = String(formData.get("emergencyName") ?? "").trim();
  const emergencyContact = String(formData.get("emergencyContact") ?? "").trim();
  if (primary && !/^[+\d][\d\s-]{6,}$/.test(primary)) return { error: "Enter a valid primary e-Intercom number." };
  await db.update(units).set({ intercomPrimary: primary || null, intercomSecondary: secondary || null, emergencyName: emergencyName || null, emergencyContact: emergencyContact || null }).where(eq(units.id, ctx.unit.id));
  await audit(ctx, "household.contacts.updated", "unit", ctx.unit.id);
  revalidatePath("/app/my-home");
  return { ok: true, message: "Contacts updated." };
}

export async function addFamilyMember(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const name = String(formData.get("name") ?? "").trim();
  const relation = String(formData.get("relation") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const age = Number(formData.get("age") ?? 0) || null;
  const hasApp = formData.get("hasApp") === "on";
  if (!name) return { error: "Enter their name." };
  if (!relation) return { error: "Enter their relationship to you." };
  const id = crypto.randomUUID();
  await db.insert(familyMembers).values({ id, membershipId: ctx.membership.id, name, relation, phone: phone || null, age, hasApp });
  await audit(ctx, "household.family.added", "family_member", id, { name, relation });
  revalidatePath("/app/my-home");
  return { ok: true, message: `${name} added to your household.` };
}

export async function removeFamilyMember(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.delete(familyMembers).where(and(eq(familyMembers.id, id), eq(familyMembers.membershipId, ctx.membership.id)));
  revalidatePath("/app/my-home");
}

export async function addVehicle(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const registrationNo = String(formData.get("registrationNo") ?? "").trim().toUpperCase();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const type = String(formData.get("type") ?? "car") as "car" | "bike" | "ev" | "bicycle";
  const color = String(formData.get("color") ?? "").trim();
  const parkingSlot = String(formData.get("parkingSlot") ?? "").trim();
  if (!registrationNo || !make || !model) return { error: "Registration number, make and model are required." };
  const [existing] = await db.select({ id: vehicles.id }).from(vehicles).where(and(eq(vehicles.societyId, ctx.society.id), eq(vehicles.registrationNo, registrationNo))).limit(1);
  if (existing) return { error: "That vehicle is already registered in the society." };
  const id = crypto.randomUUID();
  await db.insert(vehicles).values({ id, societyId: ctx.society.id, unitId: ctx.unit.id, userId: ctx.user.id, type, make, model, color: color || null, registrationNo, parkingSlot: parkingSlot || null, createdAt: new Date() });
  await audit(ctx, "household.vehicle.added", "vehicle", id, { registrationNo });
  revalidatePath("/app/my-home");
  revalidatePath("/app/directory");
  return { ok: true, message: `${make} ${model} registered.` };
}

export async function removeVehicle(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.unitId, ctx.unit.id)));
  revalidatePath("/app/my-home");
  revalidatePath("/app/directory");
}

export async function addPet(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "Dog");
  const breed = String(formData.get("breed") ?? "").trim();
  const ageYears = Number(formData.get("ageYears") ?? 0) || null;
  const vaccinationDue = String(formData.get("vaccinationDue") ?? "") || null;
  if (!name) return { error: "Enter your pet's name." };
  const id = crypto.randomUUID();
  await db.insert(pets).values({ id, societyId: ctx.society.id, unitId: ctx.unit.id, name, species, breed: breed || null, ageYears, vaccinationDue, vaccinated: !!vaccinationDue, notes: String(formData.get("notes") ?? "") || null });
  await audit(ctx, "household.pet.added", "pet", id, { name, species });
  revalidatePath("/app/my-home");
  revalidatePath("/app/directory");
  return { ok: true, message: `${name} added to the pet directory.` };
}

export async function removePet(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.delete(pets).where(and(eq(pets.id, id), eq(pets.unitId, ctx.unit.id)));
  revalidatePath("/app/my-home");
  revalidatePath("/app/directory");
}

export async function addDailyHelp(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const shift = String(formData.get("shift") ?? "").trim();
  if (!name || name.length > 80 || !role || role.length > 80) return { error: "Enter a name and role, up to 80 characters each." };
  if (!validVisitorPhone(phone)) return { error: "Enter the phone number they will give at the gate." };
  const id = crypto.randomUUID();
  const registered = db.transaction((tx) => {
    const existing = tx.select({ phone: staff.phone }).from(staff).where(and(
      eq(staff.unitId, ctx.unit.id), eq(staff.societyId, ctx.society.id), eq(staff.active, true), eq(staff.kind, "daily_help"),
    )).all();
    if (existing.some((person) => phoneKey(person.phone) === phoneKey(phone))) return false;
    tx.insert(staff).values({
    id, societyId: ctx.society.id, unitId: ctx.unit.id, name, kind: "daily_help", role, phone,
    photoColor: "#c2547e", shift: shift || "Flexible",
    rating: null, policeVerified: false, active: true, monthlyRate: Math.round(Number(formData.get("monthlyRate") ?? 0) * 100) || null, joinedAt: new Date(),
    }).run();
    return true;
  }, { behavior: "immediate" });
  if (!registered) return { error: "That phone number is already registered for daily help at your home." };
  const guards = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["guard", "security_manager"])));
  if (guards.length) {
    await db.insert(notifications).values(guards.map((g) => ({ id: crypto.randomUUID(), userId: g.userId, societyId: ctx.society.id, title: "New daily help added", body: `${ctx.user.name} added ${name} (${role}) for Home ${ctx.unit.number}. Verification pending.`, type: "security" as const, link: "/gate", createdAt: new Date() })));
  }
  await audit(ctx, "household.daily_help.added", "staff", id, { name, role });
  revalidatePath("/app/my-home");
  revalidatePath("/gate");
  revalidatePath("/admin/staff");
  return { ok: true, message: `${name} added. The security team will verify their ID at the gate.` };
}

export async function removeDailyHelp(formData: FormData) {
  const ctx = await requireResident();
  const id = String(formData.get("id") ?? "");
  await db.update(staff).set({ active: false }).where(and(eq(staff.id, id), eq(staff.unitId, ctx.unit.id), eq(staff.societyId, ctx.society.id), eq(staff.kind, "daily_help")));
  revalidatePath("/app/my-home");
  revalidatePath("/gate");
  revalidatePath("/app/directory");
}

export async function reviewDailyHelp(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const staffId = String(formData.get("staffId") ?? "");
  const rating = Number(formData.get("rating"));
  const review = String(formData.get("review") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || review.length > 500) return { error: "Choose 1–5 stars and keep your review within 500 characters." };
  const saved = db.transaction((tx) => {
    const person = tx.select({ id: staff.id }).from(staff).where(and(
      eq(staff.id, staffId), eq(staff.unitId, ctx.unit.id), eq(staff.societyId, ctx.society.id),
      eq(staff.kind, "daily_help"), eq(staff.active, true), eq(staff.policeVerified, true),
    )).get();
    if (!person) return false;
    const updatedAt = new Date();
    tx.insert(dailyHelpReviews).values({ id: crypto.randomUUID(), staffId, reviewerId: ctx.user.id, rating, review: review || null, updatedAt })
      .onConflictDoUpdate({ target: [dailyHelpReviews.staffId, dailyHelpReviews.reviewerId], set: { rating, review: review || null, updatedAt } }).run();
    return true;
  }, { behavior: "immediate" });
  if (!saved) return { error: "You can review verified daily help registered to your home." };
  revalidatePath("/app/my-home");
  return { ok: true, message: "Private review saved." };
}

export async function createMoveRequest(_prev: HouseholdState, formData: FormData): Promise<HouseholdState> {
  const ctx = await requireResident();
  const type = String(formData.get("type") ?? "move_out") as "move_in" | "move_out";
  const date = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!date) return { error: "Choose a move date." };
  const id = crypto.randomUUID();
  await db.insert(moveRequests).values({ id, societyId: ctx.society.id, unitId: ctx.unit.id, userId: ctx.user.id, type, date, notes: notes || null, status: "pending", createdAt: new Date() });
  const admins = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, ctx.society.id), inArray(memberships.role, ["admin", "manager"])));
  if (admins.length) {
    await db.insert(notifications).values(admins.map((a) => ({ id: crypto.randomUUID(), userId: a.userId, societyId: ctx.society.id, title: "Move request needs approval", body: `${ctx.user.name} requested a ${type.replace("_", "-")} for Home ${ctx.unit.number} on ${date}.`, type: "system" as const, link: "/admin/residents", createdAt: new Date() })));
  }
  await audit(ctx, "move.requested", "move_request", id, { type, date });
  revalidatePath("/app/my-home");
  revalidatePath("/admin/residents");
  return { ok: true, message: "Move request submitted. The committee will review it." };
}
