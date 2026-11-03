import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Droplets, Dumbbell, ArrowUpDown, ImageIcon,
  Lightbulb, Lock, MessageSquare, Package as PackageIcon, RotateCcw, ShieldCheck, Sparkles, Star, Wifi, Wrench,
} from "lucide-react";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/client";
import { RatingForm } from "./rating-form";
import { requireResident } from "@/lib/queries";
import { db } from "@/db";
import { helpdeskTickets, ticketComments, users } from "@/db/schema";
import { addTicketComment, reopenTicket } from "@/lib/actions/helpdesk";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const icons: Record<string, typeof Wrench> = { Plumbing: Droplets, Electrical: Lightbulb, Lifts: ArrowUpDown, Housekeeping: Sparkles, Security: ShieldCheck, Parking: PackageIcon, "Common areas": Dumbbell, Intercom: Lock, Internet: Wifi, Other: Wrench };
const statusMeta: Record<string, { label: string; variant: "blue" | "warning" | "success" | "danger" | "neutral" | "purple" }> = {
  open: { label: "Open", variant: "blue" }, assigned: { label: "Assigned", variant: "purple" }, in_progress: { label: "In progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" }, closed: { label: "Closed", variant: "neutral" }, reopened: { label: "Reopened", variant: "danger" },
};

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = await requireResident();
  const { id } = await params;
  const { created } = await searchParams;
  const [row] = await db.select({ ticket: helpdeskTickets, assignee: users }).from(helpdeskTickets).leftJoin(users, eq(helpdeskTickets.assigneeId, users.id)).where(eq(helpdeskTickets.id, id)).limit(1);
  if (!row || row.ticket.unitId !== ctx.unit.id) notFound();
  const t = row.ticket;
  const comments = await db.select({ comment: ticketComments, author: users }).from(ticketComments).innerJoin(users, eq(ticketComments.authorId, users.id)).where(and(eq(ticketComments.ticketId, id), eq(ticketComments.internal, false))).orderBy(asc(ticketComments.createdAt));
  const Icon = icons[t.category] ?? Wrench;
  const meta = statusMeta[t.status] ?? statusMeta.open;
  const finished = ["resolved", "closed"].includes(t.status);
  const overdue = t.slaDueAt && t.slaDueAt < new Date() && !finished;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/app/helpdesk" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-3.5" /> Back to helpdesk</Link>
      {created ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint-600/20 bg-mint-50 px-3.5 py-2.5 text-[11px] font-medium text-mint-600"><CheckCircle2 className="size-4" /> Request raised. The team has been notified and you&apos;ll get an update shortly.</div> : null}
      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${finished ? "bg-mint-50 text-mint-600" : "bg-brand-50 text-brand-600"}`}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><Badge variant={meta.variant}>{meta.label}</Badge>{t.priority === "urgent" ? <Badge variant="danger"><AlertTriangle className="size-2.5" /> Urgent</Badge> : t.priority === "high" ? <Badge variant="warning">High</Badge> : null}<span className="text-[9px] text-muted">Ticket #{t.id.slice(0, 6).toUpperCase()}</span></div>
                  <h1 className="mt-2 text-[21px] font-semibold leading-snug tracking-[-0.03em] text-ink sm:text-[25px]">{t.subject}</h1>
                  <p className="mt-1.5 text-[9.5px] text-muted">{t.category} · {t.scope === "personal" ? `Home ${ctx.unit.number}` : "Common area"} · Raised {formatDateTime(t.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <p className="whitespace-pre-line text-[12.5px] leading-[1.85] text-ink-soft">{t.description}</p>
              {t.attachments?.length ? <div className="mt-4 flex gap-2">{t.attachments.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-xl border border-line"><img src={src} alt="Attachment" className="size-full object-cover" /></a>)}</div> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Conversation" description="Updates from you and the community team" icon={<MessageSquare className="size-4" />} />
            <div className="border-t border-line px-5 py-5 sm:px-6">
              <div className="space-y-4">
                {comments.map(({ comment: c, author }) => (
                  <div key={c.id} className={`flex gap-2.5 ${author.id === ctx.user.id ? "flex-row-reverse" : ""}`}>
                    <Avatar name={author.name} color={author.avatarColor} size="sm" />
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${author.id === ctx.user.id ? "bg-brand-600 text-white" : "bg-canvas text-ink"}`}>
                      <div className={`flex items-center gap-2 text-[9px] ${author.id === ctx.user.id ? "text-white/60" : "text-muted"}`}><span className="font-semibold">{author.name}</span><span>{timeAgo(c.createdAt)}</span></div>
                      <p className={`mt-1 whitespace-pre-line text-[11.5px] leading-relaxed ${author.id === ctx.user.id ? "text-white/90" : "text-ink-soft"}`}>{c.body}</p>
                    </div>
                  </div>
                ))}
                {!comments.length ? <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[10.5px] text-muted">No messages yet. The team will update you here.</p> : null}
              </div>
              {!finished ? (
                <form action={addTicketComment} className="mt-5 border-t border-line pt-4">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <textarea name="body" required rows={2} placeholder="Add a comment or more detail…" className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-[12px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  <div className="mt-2 flex items-center justify-between"><p className="text-[9px] text-muted">The team is notified when you reply.</p><SubmitButton size="sm">Send reply</SubmitButton></div>
                </form>
              ) : null}
            </div>
          </Card>

          {finished ? (
            <Card>
              <CardHeader title={t.rating ? "Your feedback" : "How did we do?"} description={t.rating ? "Thank you for helping us improve" : "Rate the resolution — it takes a few seconds"} icon={<Star className="size-4" />} />
              <div className="border-t border-line px-5 py-4 sm:px-6">
                {t.rating ? <div><div className="flex items-center gap-1 text-amber-ink">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < t.rating! ? "fill-[#d9a23a] text-[#d9a23a]" : "text-line-strong"}`} />)}</div>{t.feedback ? <p className="mt-2 text-[11px] italic text-ink-soft">“{t.feedback}”</p> : null}</div> : <RatingForm ticketId={t.id} />}
                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer list-none text-[10.5px] font-semibold text-brand-600">Not fully resolved? Reopen this request</summary>
                  <form action={reopenTicket} className="mt-2 space-y-2">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <textarea name="reason" required rows={2} placeholder="What still needs attention?" className="w-full rounded-xl border border-line-strong px-3 py-2 text-[11px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    <SubmitButton size="sm" variant="outline"><RotateCcw className="size-3.5" /> Reopen request</SubmitButton>
                  </form>
                </details>
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Request details" icon={<Clock3 className="size-4" />} />
            <div className="border-t border-line px-5 py-4">
              {[
                ["Status", <Badge key="s" variant={meta.variant}>{meta.label}</Badge>],
                ["Priority", <span key="p" className="text-[10.5px] font-semibold capitalize text-ink">{t.priority}</span>],
                ["Assigned to", row.assignee ? <span key="a" className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-ink"><Avatar name={row.assignee.name} color={row.assignee.avatarColor} size="xs" className="!size-5 !text-[7px]" /> {row.assignee.name}</span> : <span key="u" className="text-[10px] text-muted">Awaiting assignment</span>],
                ["SLA due", <span key="d" className={`text-[10.5px] font-semibold ${overdue ? "text-[#c43d4d]" : "text-ink"}`}>{t.slaDueAt ? formatDate(t.slaDueAt) + " · " + t.slaDueAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—"}</span>],
                ["Last update", <span key="l" className="text-[10.5px] text-ink">{timeAgo(t.updatedAt)}</span>],
                ["Reopened", <span key="r" className="text-[10.5px] text-ink">{t.reopenedCount}×</span>],
              ].map(([label, value]) => <div key={label as string} className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0"><span className="text-[10px] text-muted">{label}</span>{value}</div>)}
            </div>
          </Card>
          <div className="rounded-[18px] border border-line bg-[#fbfcff] p-4">
            <p className="text-[11px] font-semibold text-ink">Need to add something?</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">Reply on the conversation and the assigned team member and helpdesk manager will both see it.</p>
          </div>
          <div className="rounded-[18px] bg-gradient-to-br from-brand-50 to-blush-50 p-4">
            <p className="text-[11px] font-semibold text-ink">Escalation path</p>
            <div className="mt-2 flex items-center gap-1 text-[9px] font-medium text-ink-soft"><span className="rounded bg-white px-1.5 py-1">Helpdesk</span><span>→</span><span className="rounded bg-white px-1.5 py-1">Facility manager</span><span>→</span><span className="rounded bg-white px-1.5 py-1">Committee</span></div>
            <p className="mt-2 text-[9px] text-muted">If an SLA is missed, your ticket moves up automatically.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
