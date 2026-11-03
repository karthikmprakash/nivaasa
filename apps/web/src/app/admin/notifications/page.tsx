import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { NotificationRow } from "@/components/app/notification-row";
import { SubmitButton } from "@/components/ui/client";
import { getNotifications, getUnreadCount, requireAdmin } from "@/lib/queries";
import { markAllNotificationsRead } from "@/lib/actions/community";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const ctx = await requireAdmin();
  const { filter = "all" } = await searchParams;
  const rows = await getNotifications(ctx.user.id, ctx.society!.id, 60);
  const unread = await getUnreadCount(ctx.user.id, ctx.society!.id);
  const list = filter === "unread" ? rows.filter((n) => !n.readAt) : rows;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Admin updates" title="Notifications" description="Approvals, payment verifications, escalations and community moderation." actions={unread ? <form action={markAllNotificationsRead}><SubmitButton size="sm" variant="outline"><CheckCheck className="size-3.5" /> Mark all read</SubmitButton></form> : null} />
      <div className="mt-4 flex gap-1.5"><Link href="/admin/notifications" className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold ${filter === "all" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft"}`}>All</Link><Link href="/admin/notifications?filter=unread" className={`rounded-full border px-3.5 py-2 text-[10px] font-semibold ${filter === "unread" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft"}`}>Unread {unread ? `(${unread})` : ""}</Link></div>
      <div className="mt-4 space-y-2">{list.map((n) => <NotificationRow key={n.id} id={n.id} title={n.title} body={n.body} type={n.type} link={n.link} read={!!n.readAt} createdAt={n.createdAt.toISOString()} />)}{!list.length ? <div className="rounded-2xl border border-dashed border-line px-5 py-14 text-center"><Bell className="mx-auto size-6 text-muted" /><p className="mt-2 text-[11px] text-muted">Nothing here.</p></div> : null}</div>
    </div>
  );
}
