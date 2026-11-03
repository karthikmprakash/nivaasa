import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, ArrowLeft, Clock3, MessageSquare, Paperclip, Star, UserRound, Wrench } from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { requireAdmin } from "@/lib/queries";
import { db } from "@/db";
import { helpdeskTickets, memberships, ticketComments, units, users } from "@/db/schema";
import { adminAddComment, adminUpdateTicket } from "@/lib/actions/helpdesk";
import { formatDateTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const [row] = await db.select({ ticket: helpdeskTickets, unit: units.number, requester: users }).from(helpdeskTickets).leftJoin(units, eq(helpdeskTickets.unitId, units.id)).innerJoin(users, eq(helpdeskTickets.raisedBy, users.id)).where(eq(helpdeskTickets.id, id)).limit(1);
  if (!row || row.ticket.societyId !== ctx.society!.id) notFound();
  const t = row.ticket;
  const [comments, assignees] = await Promise.all([
    db.select({ comment: ticketComments, author: users }).from(ticketComments).innerJoin(users, eq(ticketComments.authorId, users.id)).where(eq(ticketComments.ticketId, id)).orderBy(asc(ticketComments.createdAt)),
    db.select({ id: users.id, name: users.name, role: memberships.role }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(and(eq(memberships.societyId, ctx.society!.id), inArray(memberships.role, ["manager", "helpdesk_manager", "security_manager", "guard", "committee", "accountant"]))),
  ]);
  return (
    <div>
      <Link href="/admin/helpdesk" className="mb-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Helpdesk</Link>
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="border-b border-line p-5">
              <div className="flex flex-wrap items-center gap-1.5"><Badge variant={t.status === "resolved" || t.status === "closed" ? "success" : t.status === "reopened" ? "danger" : "warning"}>{t.status.replace("_", " ")}</Badge>{t.priority === "urgent" ? <Badge variant="danger"><AlertTriangle className="size-2.5" /> Urgent</Badge> : <Badge variant="outline">{t.priority}</Badge>}<span className="text-[8.5px] text-muted">#{t.id.slice(0, 6).toUpperCase()}</span></div>
              <h1 className="mt-2 text-[21px] font-semibold tracking-[-0.03em] text-ink">{t.subject}</h1>
              <p className="mt-1 text-[9.5px] text-muted">{t.category} · Home {row.unit} · raised by {row.requester.name} · {formatDateTime(t.createdAt)}</p>
              <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-ink-soft">{t.description}</p>
              {t.attachments?.length ? <div className="mt-3 flex gap-2">{t.attachments.map((a) => <a key={a} href={a} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-xl border border-line"><img src={a} alt="Attachment" className="size-full object-cover" /></a>)}</div> : null}
            </div>
            <CardHeader title="Conversation" description="Public updates and internal notes" icon={<MessageSquare className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              <div className="space-y-3">
                {comments.map(({ comment: c, author }) => <div key={c.id} className={`rounded-xl border px-3 py-2.5 ${c.internal ? "border-amber-ink/20 bg-amber-soft/40" : "border-line bg-white"}`}><div className="flex items-center gap-2"><Avatar name={author.name} color={author.avatarColor} size="xs" /><span className="text-[9px] font-semibold text-ink">{author.name}</span><span className="text-[8px] text-muted">{timeAgo(c.createdAt)}</span>{c.internal ? <Badge variant="warning">Internal</Badge> : null}</div><p className="mt-1.5 whitespace-pre-line text-[10.5px] leading-relaxed text-ink-soft">{c.body}</p></div>)}
              </div>
              <form action={adminAddComment} className="mt-4 border-t border-line pt-3"><input type="hidden" name="ticketId" value={t.id} /><textarea name="body" rows={2} required placeholder="Reply to the resident or add an internal note…" className="w-full rounded-xl border border-line px-3 py-2 text-[11px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" /><div className="mt-2 flex items-center justify-between"><label className="flex items-center gap-1.5 text-[9px] text-muted"><input type="checkbox" name="internal" className="size-3.5 accent-[#3155d8]" /> Internal note</label><SubmitButton size="sm">Post update</SubmitButton></div></form>
            </div>
          </Card>
          {t.rating ? <Card><CardHeader title="Resident feedback" icon={<Star className="size-4" />} /><div className="border-t border-line px-5 py-4"><div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < t.rating! ? "fill-[#d9a23a] text-[#d9a23a]" : "text-line-strong"}`} />)}</div>{t.feedback ? <p className="mt-2 text-[11px] italic text-ink-soft">“{t.feedback}”</p> : null}</div></Card> : null}
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader title="Manage request" description="Assign, prioritise and update status" icon={<Wrench className="size-4" />} />
            <form action={adminUpdateTicket} className="space-y-3 border-t border-line p-5">
              <input type="hidden" name="ticketId" value={t.id} />
              <label className="block text-[9.5px] font-semibold text-ink-soft">Status<select name="status" defaultValue={t.status} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-[10.5px]"><option value="open">Open</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="reopened">Reopened</option></select></label>
              <label className="block text-[9.5px] font-semibold text-ink-soft">Assignee<select name="assigneeId" defaultValue={t.assigneeId ?? ""} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-[10.5px]"><option value="">Unassigned</option>{assignees.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.role.replace("_", " ")}</option>)}</select></label>
              <label className="block text-[9.5px] font-semibold text-ink-soft">Priority<select name="priority" defaultValue={t.priority} className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-[10.5px]"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
              <label className="block text-[9.5px] font-semibold text-ink-soft">Note to resident<textarea name="note" rows={2} placeholder="Optional update" className="mt-1 w-full rounded-lg border border-line px-2 py-2 text-[10.5px]" /></label>
              <SubmitButton size="sm" className="w-full">Save changes</SubmitButton>
            </form>
          </Card>
          <Card><CardHeader title="Requester" icon={<UserRound className="size-4" />} /><div className="border-t border-line p-5"><div className="flex items-center gap-2.5"><Avatar name={row.requester.name} color={row.requester.avatarColor} size="md" /><div><p className="text-[11px] font-semibold text-ink">{row.requester.name}</p><p className="text-[9px] text-muted">Home {row.unit} · {row.requester.phone}</p></div></div><div className="mt-3 space-y-2 border-t border-line pt-3"><div className="flex justify-between text-[9px]"><span className="text-muted">SLA due</span><span className="font-medium text-ink">{t.slaDueAt ? formatDateTime(t.slaDueAt) : "—"}</span></div><div className="flex justify-between text-[9px]"><span className="text-muted">Reopened</span><span className="font-medium text-ink">{t.reopenedCount}×</span></div><div className="flex justify-between text-[9px]"><span className="text-muted">Last update</span><span className="font-medium text-ink">{timeAgo(t.updatedAt)}</span></div></div></div></Card>
          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-ink"><Clock3 className="size-3.5 text-brand-600" /> SLA policy</p><p className="mt-1 text-[9px] leading-relaxed text-muted">Urgent 4h · High 8h · Medium 24h · Low 48h. Escalates automatically to the manager, then the committee.</p></div>
        </aside>
      </div>
    </div>
  );
}
