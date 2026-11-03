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
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
    setTimeout(() => router.refresh(), 350);
  }
  const content = (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors", read ? "border-line bg-white" : "border-brand-100 bg-brand-50/30", link ? "hover:border-brand-200 hover:bg-white" : "")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tones[type] ?? "bg-canvas text-muted")}><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5"><p className="text-[11.5px] font-semibold text-ink">{title}</p>{!read ? <span className="size-1.5 rounded-full bg-brand-500" /> : null}</div>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-soft">{body}</p>
        <p className="mt-1 text-[8.5px] text-muted">{timeAgo(createdAt)}</p>
      </div>
    </div>
  );
  if (!link) return <div onClick={markRead}>{content}</div>;
  return <Link href={link} onClick={markRead}>{content}</Link>;
}
