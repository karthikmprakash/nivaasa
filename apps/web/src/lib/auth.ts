import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { memberships, sessions, societies, units, users, type Membership, type Society, type Unit, type User } from "@/db/schema";
import { isAdminRoleValue } from "@/lib/society-access";

export const SESSION_COOKIE = "nivaasa_session";
const SESSION_DAYS = 7;

export type AuthContext = {
  user: User;
  membership: Membership | null;
  memberships: Membership[];
  society: Society | null;
  unit: Unit | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    createdAt: new Date(),
  });
  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
  store.delete("nivaasa_society");
}

async function resolveToken(): Promise<string | null> {
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export const getSession = cache(async (): Promise<AuthContext | null> => {
  const token = await resolveToken();
  if (!token) return null;

  const rows = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!rows.length) return null;
  const user = rows[0].user;

  const mems = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")))
    .orderBy(memberships.joinedAt);

  // Prefer the cookie-selected society, then primary membership.
  const store = await cookies();
  const preferredSociety = store.get("nivaasa_society")?.value;
  const membership =
    mems.find((m) => m.societyId === preferredSociety) ??
    mems.find((m) => m.isPrimary) ??
    mems[0] ??
    null;

  let society: Society | null = null;
  let unit: Unit | null = null;
  if (membership) {
    const [s] = await db.select().from(societies).where(eq(societies.id, membership.societyId)).limit(1);
    society = s ?? null;
    if (membership.unitId) {
      const [u] = await db.select().from(units).where(eq(units.id, membership.unitId)).limit(1);
      unit = u ?? null;
    }
  }

  return { user, membership, memberships: mems, society, unit };
});

export function isAdminRole(role?: string | null) {
  return isAdminRoleValue(role);
}

export function isResidentRole(role?: string | null) {
  return !!role && ["owner", "tenant", "family"].includes(role);
}

export function canManage(role?: string | null) {
  return !!role && ["admin", "manager", "super_admin"].includes(role);
}

export function canManageBilling(role?: string | null) {
  return !!role && ["admin", "manager", "accountant", "super_admin"].includes(role);
}

export function canManageHelpdesk(role?: string | null) {
  return !!role && ["admin", "manager", "helpdesk_manager", "super_admin"].includes(role);
}

export function canManageSecurity(role?: string | null) {
  return !!role && ["admin", "manager", "security_manager", "guard", "super_admin"].includes(role);
}

export function isSuperAdmin(user: User) {
  return user.globalRole === "super_admin";
}
