import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { and, eq as eqOp } from "drizzle-orm";
import { verifyPassword } from "./password";
import { createSessionToken, getSession, isAdminRole, isResidentRole } from "./auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimited(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= 10;
}

export function recordLoginFailure(key: string) {
  const existing = attempts.get(key);
  if (!existing || Date.now() > existing.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 });
  } else {
    existing.count += 1;
  }
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export async function authenticate(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (loginRateLimited(normalized)) {
    return { error: "Too many attempts. Please try again in 15 minutes." as const };
  }
  const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    recordLoginFailure(normalized);
    return { error: "That email and password don't match." as const };
  }
  clearLoginFailures(normalized);
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));
  const [membership] = await db
    .select()
    .from(memberships)
    .where(and(eqOp(memberships.userId, user.id), eqOp(memberships.status, "active")))
    .limit(1);
  const session = await createSessionToken(user.id);
  const home =
    user.globalRole === "super_admin"
      ? "/portfolio"
      : membership?.role === "guard"
        ? "/gate"
        : ["admin", "committee", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(membership?.role ?? "")
          ? "/admin"
          : "/app";
  return { user, membership, home, ...session };
}

export async function homeForUser() {
  const ctx = await getSession();
  if (!ctx) return "/login";
  if (ctx.user.globalRole === "super_admin") return "/portfolio";
  const role = ctx.membership?.role;
  if (role === "guard") return "/gate";
  if (isAdminRole(role)) return "/admin";
  if (isResidentRole(role)) return "/app";
  return "/app";
}
