import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeClasses = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["caption", "body", "section", "title"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
}

export function avatarForeground(background: string) {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const rgb = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return luminance > 0.179 ? "#131a2a" : "#ffffff";
}

export function formatINR(paise: number, compact = false): string {
  const rupees = paise / 100;
  if (compact && Math.abs(rupees) >= 100000) {
    return `₹${(rupees / 100000).toFixed(rupees >= 10000000 ? 0 : 1)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function timeAgo(date: Date | number | string | null | undefined) {
  if (!date) return "";
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

export function formatDate(date: Date | number | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...(opts ?? { day: "numeric", month: "short", year: "numeric" }) });
}

export function formatTime(date: Date | number | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateTime(date: Date | number | string | null | undefined) {
  if (!date) return "—";
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += Math.floor(Math.random() * 10);
  return code;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
