import "server-only";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, societies } from "@/db/schema";
import type { AuthContext } from "@/lib/auth";
import { resolveSwitchPath, societyHomePath } from "@/lib/society-access";

export const SOCIETY_COOKIE = "nivaasa_society";
const SOCIETY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Point the session at another society the user belongs to and return the page
 * they should land on. The cookie is only an ordering preference: every read
 * still validates the membership against the database.
 */
export async function switchSocietyForSession(session: AuthContext, slug: string, next?: string | null) {
  const [row] = await db
    .select({ society: societies, membership: memberships })
    .from(memberships)
    .innerJoin(societies, eq(societies.id, memberships.societyId))
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.status, "active"), eq(societies.slug, slug)))
    .limit(1);

  if (!row) {
    return societyHomePath({
      role: session.membership?.role,
      hasUnit: !!session.unit,
      isSuper: session.user.globalRole === "super_admin",
    });
  }

  const store = await cookies();
  store.set(SOCIETY_COOKIE, row.society.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SOCIETY_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });

  return resolveSwitchPath({
    role: row.membership.role,
    hasUnit: !!row.membership.unitId,
    isSuper: session.user.globalRole === "super_admin",
    next,
  });
}
