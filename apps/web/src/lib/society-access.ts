/**
 * Pure membership helpers shared by server actions, route handlers and the UI.
 * Keep this file free of server-only imports so client components can use the
 * types and path rules without pulling in the database.
 */

export type SocietyOption = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  role: string;
  unitNumber: string | null;
  isPrimary: boolean;
};

const ADMIN_ROLES = new Set([
  "admin",
  "committee",
  "manager",
  "accountant",
  "helpdesk_manager",
  "security_manager",
  "auditor",
  "super_admin",
]);

const RESIDENT_ROLES = new Set(["owner", "tenant", "family"]);

export function isAdminRoleValue(role?: string | null) {
  return !!role && ADMIN_ROLES.has(role);
}

export function isResidentRoleValue(role?: string | null) {
  return !!role && RESIDENT_ROLES.has(role);
}

/** The landing page for a membership in the selected society. */
export function societyHomePath({
  role,
  hasUnit,
  isSuper = false,
}: {
  role?: string | null;
  hasUnit?: boolean;
  isSuper?: boolean;
}) {
  if (isSuper) return "/admin";
  if (role === "guard") return "/gate";
  if (isAdminRoleValue(role)) return "/admin";
  if (hasUnit || isResidentRoleValue(role)) return "/app";
  return "/app";
}

/**
 * Only keep a post-switch destination when the new membership can actually use
 * it. A society admin switching to a resident-only membership must land in the
 * resident app, not on an admin route.
 */
export function resolveSwitchPath({
  role,
  hasUnit,
  isSuper = false,
  next,
}: {
  role?: string | null;
  hasUnit?: boolean;
  isSuper?: boolean;
  next?: string | null;
}) {
  const home = societyHomePath({ role, hasUnit, isSuper });
  if (!isSafeInternalPath(next)) return home;

  const roots = isSuper
    ? ["/admin", "/gate"]
    : role === "guard"
      ? ["/gate"]
      : isAdminRoleValue(role)
        ? ["/admin", "/gate"]
        : ["/app"];

  return roots.some((root) => next === root || next.startsWith(`${root}/`)) ? next : home;
}

/** Reject absolute URLs, protocol-relative URLs and path traversal. */
export function isSafeInternalPath(path?: string | null): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\") || path.includes("..")) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  if (decoded.includes("\\") || decoded.includes("..")) return false;
  return !/[\u0000-\u001f]/.test(decoded);
}
