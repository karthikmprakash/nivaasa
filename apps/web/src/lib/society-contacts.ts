import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";

export type SocietyContact = {
  name: string;
  phone: string;
  role: string;
  designation: string | null;
};

/**
 * The people a resident can actually reach in this society. These pages used
 * to show seed-community phone numbers, which is dangerous in a real society
 * and simply wrong after a society switch.
 */
export async function getSocietyContacts(societyId: string) {
  const rows = await db
    .select({
      name: users.name,
      phone: users.phone,
      role: memberships.role,
      designation: memberships.designation,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(and(
      eq(memberships.societyId, societyId),
      eq(memberships.status, "active"),
      inArray(memberships.role, ["guard", "security_manager", "manager", "admin"]),
    ))
    .orderBy(asc(memberships.joinedAt));

  const pick = (roles: string[]) => rows.find((row) => roles.includes(row.role) && !!row.phone) ?? null;
  const guard = pick(["guard"]) ?? pick(["security_manager"]);
  const security = pick(["security_manager"]) ?? pick(["guard"]);
  const manager = pick(["manager"]) ?? pick(["admin"]);
  return { guard, security, manager };
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
