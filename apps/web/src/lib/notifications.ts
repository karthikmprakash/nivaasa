import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";

export type NotificationPrefKey = "visitors" | "payments" | "community" | "helpdesk";

/**
 * Respect the per-society notification switches residents manage in Settings.
 * Missing preferences default to on, and staff memberships (which do not have
 * the resident settings screen) keep receiving operational alerts.
 */
export async function filterRecipientsByPref<T extends { userId: string }>(
  societyId: string,
  recipients: T[],
  pref: NotificationPrefKey,
): Promise<T[]> {
  if (!recipients.length) return recipients;
  const userIds = [...new Set(recipients.map((r) => r.userId))];
  const rows = await db
    .select({ userId: memberships.userId, prefs: memberships.notificationPrefs })
    .from(memberships)
    .where(and(eq(memberships.societyId, societyId), eq(memberships.status, "active"), inArray(memberships.userId, userIds)));
  const disabled = new Set(rows.filter((r) => r.prefs?.[pref] === false).map((r) => r.userId));
  return recipients.filter((r) => !disabled.has(r.userId));
}
