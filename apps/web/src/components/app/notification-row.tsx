"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Bell, CalendarHeart, CheckCircle2, Megaphone, MessageSquare, Package, ShieldAlert, Wallet, Wrench,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

const icons: Record<string, typeof Bell> = { visitor: ShieldAlert, delivery: Package, payment: Wallet, helpdesk: Wrench, notice: Megaphone, amenity: CalendarHeart, security: AlertTriangle, community: MessageSquare, system: CheckCircle2 };
const tones: Record<string, string> = { visitor: "bg-blush-50 text-blush-500", payment: "bg-mint-50 text-mint-600", helpdesk: "bg-brand-50 text-brand-600", notice: "bg-amber-soft text-amber-ink", amenity: "bg-[#f2effc] text-[#6a54c8]", security: "bg-[#fdeced] text-[#c43d4d]", community: "bg-brand-50 text-brand-600", system: "bg-canvas text-muted", delivery: "bg-blush-50 text-blush-500" };

export function NotificationRow({ id, title, body, type, link, read, createdAt }: { id: string; title: string; body: string; type: string; link: string | null; read: boolean; createdAt: string }) {
  const router = useRouter();
  const Icon = icons[type] ?? Bell;
  async function markRead() {
    if (read) return;
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => null);
    router.refresh();
  }
  const content = (
    <span className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors", read ? "border-line bg-white" : "border-brand-100 bg-brand-50/30", link ? "hover:border-brand-200 hover:bg-white" : "")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tones[type] ?? "bg-canvas text-muted")}><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5"><span className="block text-body font-semibold text-ink">{title}</span>{!read ? <span className="size-1.5 rounded-full bg-brand-500" /> : null}</span>
        <span className="mt-1 block text-body leading-relaxed text-ink-soft">{body}</span>
        <span className="mt-2 block text-caption text-muted">{timeAgo(createdAt)}</span>
      </span>
    </span>
  );
  if (!link) return read ? <div>{content}</div> : <button type="button" onClick={markRead} className="block w-full text-left" aria-label={`Mark as read: ${title}`}>{content}</button>;
  return <Link href={link} onClick={markRead}>{content}</Link>;
}
