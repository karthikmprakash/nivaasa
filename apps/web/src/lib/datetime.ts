/**
 * Nivaasa stores instants in UTC but every community-facing boundary is IST.
 * These helpers keep date-only and datetime-local form values from drifting by
 * 5h30m when the server runs in UTC (as it does in Docker).
 */

function communityDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function communityDayStart(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime()) || communityDateKey(date) !== day) return null;
  return date;
}

export function communityMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

export function communityMonthStart(date = new Date()) {
  return new Date(`${communityMonthKey(date)}-01T00:00:00+05:30`);
}

export function communityTimeNow(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function communityDayEnd(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T23:59:59.999+05:30`);
  if (Number.isNaN(date.getTime()) || communityDateKey(date) !== day) return null;
  return date;
}

/** Parse a `datetime-local` value from the admin UI as Asia/Kolkata time. */
export function parseCommunityDateTime(value?: string | null) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  if (!communityDayStart(normalized.slice(0, 10))) return null;
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) ? normalized : `${normalized}+05:30`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}
