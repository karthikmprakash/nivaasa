"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { requireResident } from "@/lib/queries";
import { hashPassword, verifyPassword } from "@/lib/password";

export type SettingsState = { error?: string; ok?: boolean; message?: string };

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireResident();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2) return { error: "Enter your full name." };
  if (!/^[+\d][\d\s-]{6,}$/.test(phone)) return { error: "Enter a valid phone number." };
  await db.update(users).set({ name, phone }).where(eq(users.id, ctx.user.id));
  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true, message: "Profile updated." };
}

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireResident();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!verifyPassword(current, ctx.user.passwordHash)) return { error: "Your current password is incorrect." };
  if (next.length < 8) return { error: "Use at least 8 characters for the new password." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, ctx.user.id));
  return { ok: true, message: "Password changed." };
}

export async function updateNotificationPrefs(formData: FormData) {
  const ctx = await requireResident();
  const prefs = {
    visitors: formData.get("visitors") === "on",
    payments: formData.get("payments") === "on",
    community: formData.get("community") === "on",
    helpdesk: formData.get("helpdesk") === "on",
  };
  await db.update(memberships).set({ notificationPrefs: prefs }).where(eq(memberships.id, ctx.membership.id));
  revalidatePath("/app/settings");
}

export async function updateDirectoryVisibility(formData: FormData) {
  const ctx = await requireResident();
  const visible = formData.get("visible") === "on";
  await db.update(memberships).set({ directoryVisible: visible }).where(eq(memberships.id, ctx.membership.id));
  revalidatePath("/app/settings");
  revalidatePath("/app/directory");
}
