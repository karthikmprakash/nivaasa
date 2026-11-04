/** Derive priority SLAs from the society's default (normal) response target. */
export function slaHoursForPriority(priority: string, baseHours = 24) {
  const base = Math.max(1, Math.round(baseHours || 24));
  if (priority === "urgent") return Math.max(1, Math.round(base / 6));
  if (priority === "high") return Math.max(1, Math.round(base / 3));
  if (priority === "low") return Math.max(1, Math.round(base * 2));
  return base;
}
