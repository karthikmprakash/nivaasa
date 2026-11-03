import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/primitives";
import { NotificationRow } from "@/components/app/notification-row";
import { requireResident, getNotifications, getUnreadCount } from "@/lib/queries";
import { markAllNotificationsRead } from "@/lib/actions/community";
import { SubmitButton } from "@/components/ui/client";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const ctx = await requireResident();
  const params = await searchParams;
  const filter = params.filter ?? "all";
  const rows = await getNotifications(ctx.user.id, ctx.society.id, 60);
  const unread = await getUnreadCount(ctx.user.id, ctx.society.id);
  const list = filter === "unread" ? rows.filter((n) => !n.readAt) : rows;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Your updates" title="Notifications" description="Approvals, payments, community news and the things that need you." actions={<Link href="/app/settings" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-caption font-semibold text-ink-soft"><Settings2 className="size-4" /> Preferences</Link>} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <Link href="/app/notifications" className={`rounded-full border px-3.5 py-2 text-caption font-semibold ${filter === "all" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft"}`}>All</Link>
          <Link href="/app/notifications?filter=unread" className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-caption font-semibold ${filter === "unread" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft"}`}>Unread {unread ? <span className="rounded-full bg-blush-400 px-1.5 py-0.5 text-caption font-bold text-white">{unread}</span> : null}</Link>
        </div>
        {unread ? <form action={markAllNotificationsRead}><SubmitButton size="sm" variant="ghost"><CheckCheck className="size-4" /> Mark all read</SubmitButton></form> : null}
      </div>
      <div className="mt-4 space-y-2">
        {list.map((n) => <NotificationRow key={n.id} id={n.id} title={n.title} body={n.body} type={n.type} link={n.link} read={!!n.readAt} createdAt={n.createdAt.toISOString()} />)}
        {!list.length ? <div className="rounded-2xl border border-dashed border-line bg-white/60 px-5 py-14 text-center"><Bell className="mx-auto size-6 text-muted" /><p className="mt-3 text-body font-semibold text-ink">All caught up</p><p className="mt-1 text-caption text-muted">{filter === "unread" ? "Nothing unread. Lovely." : "New updates will appear here."}</p></div> : null}
      </div>
    </div>
  );
}
