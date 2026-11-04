import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function gateSession() {
  const session = await getSession();
  if (!session) return null;
  const role = session.membership?.role;
  if (role !== "guard" && role !== "security_manager" && role !== "admin" && session.user.globalRole !== "super_admin") return null;
  if (!session.society) return null;
  return session;
}

export async function residentsOfUnit(unitId: string, societyId: string) {
  return db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.unitId, unitId), eq(memberships.societyId, societyId), eq(memberships.status, "active"), inArray(memberships.role, ["owner", "tenant", "committee", "family"])));
}
