"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { amenities, auditLogs, billingHeads, memberships, notices, societies, towers, units, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export type OnboardingState = { error?: string; fieldErrors?: Record<string, string> };

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50) || "community"; }

export async function createCommunity(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const towerCount = Math.max(1, Math.min(10, Number(formData.get("towers") ?? 1)));
  const unitsPerTower = Math.max(4, Math.min(200, Number(formData.get("unitsPerTower") ?? 20)));
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminPhone = String(formData.get("adminPhone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 3) return { fieldErrors: { name: "Enter your community's name." } };
  if (!city) return { fieldErrors: { city: "Enter the city." } };
  if (!address) return { fieldErrors: { address: "Enter the address." } };
  if (adminName.length < 2) return { fieldErrors: { adminName: "Enter your name." } };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) return { fieldErrors: { adminEmail: "Enter a valid email." } };
  if (!/^[+\d][\d\s-]{6,}$/.test(adminPhone)) return { fieldErrors: { adminPhone: "Enter a valid phone number." } };
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters." } };
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing && !verifyPassword(password, existing.passwordHash)) {
    return { fieldErrors: { adminEmail: "That email already has a Nivaasa account. Enter that account's password, or use another email." } };
  }

  let slug = slugify(name);
  let attempt = 1;
  while (true) {
    const [s] = await db.select({ id: societies.id }).from(societies).where(eq(societies.slug, slug)).limit(1);
    if (!s) break;
    slug = `${slugify(name)}-${attempt++}`;
  }
  const societyId = crypto.randomUUID();
  const adminId = existing?.id ?? crypto.randomUUID();
  const adminDisplayName = existing?.name ?? adminName;
  const now = new Date();
  const totalUnits = towerCount * unitsPerTower;
  await db.insert(societies).values({
    id: societyId, name, slug, tagline: "A community, coming together", address, city, state, pincode,
    unitsCount: totalUnits, establishedYear: Number(todayISO().slice(0, 4)), primaryColor: "#3155d8", accentColor: "#ef7fa4",
    settings: { visitorApproval: true, visitorPassTtlHours: 24, discussionApproval: true, allowResidentClassifieds: true, lateFeePercent: 2, graceDays: 5, paymentGateway: "demo", helpdeskSlaHours: 24 },
    createdAt: now,
  });
  if (!existing) {
    await db.insert(users).values({ id: adminId, name: adminName, email: adminEmail, phone: adminPhone, passwordHash: hashPassword(password), avatarColor: "#3155d8", createdAt: now });
  }
  await db.insert(memberships).values({ id: crypto.randomUUID(), userId: adminId, societyId, unitId: null, role: "admin", designation: "Society Admin", status: "active", isPrimary: !existing, joinedAt: now });

  const codes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const unitValues: (typeof units.$inferInsert)[] = [];
  for (let t = 0; t < towerCount; t++) {
    const towerId = crypto.randomUUID();
    const code = codes[t] ?? `T${t + 1}`;
    const floors = Math.ceil(unitsPerTower / 4);
    await db.insert(towers).values({ id: towerId, societyId, name: `Tower ${code}`, code, floors, unitsCount: unitsPerTower, sortOrder: t });
    let created = 0;
    for (let floor = 1; floor <= floors && created < unitsPerTower; floor++) {
      for (let slot = 1; slot <= 4 && created < unitsPerTower; slot++) {
        unitValues.push({ id: crypto.randomUUID(), societyId, towerId, number: `${code}-${floor}${String(slot).padStart(2, "0")}`, floor, areaSqft: 950, unitType: "2BHK", status: "vacant", ownership: "vacant", parkingSlots: 1, createdAt: now });
        created++;
      }
    }
  }
  for (let i = 0; i < unitValues.length; i += 200) await db.insert(units).values(unitValues.slice(i, i + 200));
  await db.insert(billingHeads).values([
    { id: crypto.randomUUID(), societyId, name: "Maintenance", code: "MNT", basis: "per_sqft", defaultAmount: 300, gstRate: 0, recurring: true, active: true, sortOrder: 0, description: "Monthly maintenance at ₹3 per sq ft" },
    { id: crypto.randomUUID(), societyId, name: "Sinking Fund", code: "SNK", basis: "fixed", defaultAmount: 50000, gstRate: 0, recurring: true, active: true, sortOrder: 1 },
    { id: crypto.randomUUID(), societyId, name: "Water Charges", code: "WTR", basis: "fixed", defaultAmount: 30000, gstRate: 0, recurring: true, active: true, sortOrder: 2 },
  ]);
  await db.insert(amenities).values([
    { id: crypto.randomUUID(), societyId, name: "Clubhouse", description: "A space for the community to come together.", icon: "party", location: "Clubhouse", capacity: 50, slotMinutes: 120, price: 0, deposit: 0, openTime: "09:00", closeTime: "22:00", active: true, sortOrder: 0 },
    { id: crypto.randomUUID(), societyId, name: "Fitness Studio", description: "Cardio and strength equipment for residents.", icon: "dumbbell", location: "Clubhouse", capacity: 10, slotMinutes: 60, price: 0, deposit: 0, openTime: "05:30", closeTime: "22:00", active: true, sortOrder: 1 },
    { id: crypto.randomUUID(), societyId, name: "Swimming Pool", description: "A shared pool for the community.", icon: "waves", location: "Clubhouse", capacity: 20, slotMinutes: 60, price: 0, deposit: 0, openTime: "06:00", closeTime: "20:00", active: true, sortOrder: 2 },
  ]);
  await db.insert(notices).values({ id: crypto.randomUUID(), societyId, authorId: adminId, title: "Welcome to Nivaasa", body: `Welcome to ${name}!\n\nThis is your community's home. Add residents, configure billing and publish your first notice. The setup checklist in the admin console will guide you.`, category: "general", pinned: true, audience: "all", publishedAt: now });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId, actorId: adminId, actorName: adminDisplayName, action: "society.created", entity: "society", entityId: societyId, metadata: { name, towerCount, unitsPerTower }, createdAt: now });
  const session = await createSessionToken(adminId);
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
  store.set("nivaasa_society", societyId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/admin");
}
