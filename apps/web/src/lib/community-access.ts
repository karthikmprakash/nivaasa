/** Audience rules shared by community pages, notice detail and APIs. */

export type NoticeAudience = "all" | "owners" | "tenants" | "tower";
export type PollAudience = "all" | "owners" | "tenants";

const OWNER_ROLES = new Set(["owner", "committee", "admin", "manager"]);
const TENANT_ROLES = new Set(["tenant", "family"]);

export function isOwnerAudience(role?: string | null) {
  return !!role && OWNER_ROLES.has(role);
}

export function isTenantAudience(role?: string | null) {
  return !!role && TENANT_ROLES.has(role);
}

export function canViewNoticeAudience(role: string | null | undefined, audience: string) {
  if (audience === "all" || audience === "tower") return true;
  if (audience === "owners") return isOwnerAudience(role);
  if (audience === "tenants") return isTenantAudience(role);
  return false;
}

export function canVoteInPollAudience(role: string | null | undefined, audience: string) {
  if (audience === "all") return true;
  if (audience === "owners") return isOwnerAudience(role);
  if (audience === "tenants") return isTenantAudience(role);
  return false;
}

export function noticeAudiencesForRole(role: string | null | undefined): NoticeAudience[] {
  const audiences: NoticeAudience[] = ["all"];
  if (isOwnerAudience(role)) audiences.push("owners");
  if (isTenantAudience(role)) audiences.push("tenants");
  return audiences;
}

export function pollAudiencesForRole(role: string | null | undefined): PollAudience[] {
  const audiences: PollAudience[] = ["all"];
  if (isOwnerAudience(role)) audiences.push("owners");
  if (isTenantAudience(role)) audiences.push("tenants");
  return audiences;
}

/** Polls close at the end of their configured day, not only when an admin flips status. */
export function pollIsOpen(status: string, endsAt?: Date | string | null, now = new Date()) {
  if (status !== "active") return false;
  if (!endsAt) return true;
  return new Date(endsAt) >= now;
}
