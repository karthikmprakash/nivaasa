import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { helpdeskTickets, memberships, notifications, ticketComments } from "@/db/schema";
import { slaHoursForPriority } from "@/lib/helpdesk-sla";
import { filterRecipientsByPref } from "@/lib/notifications";
import type { ResidentContext } from "@/lib/queries";

export const ticketChange = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), body: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal("reopen"), reason: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal("rate"), rating: z.number().int().min(1).max(5), feedback: z.string().trim().max(1000).optional() }),
]);

export async function notifyTicket(stakeholders: { userId: string }[], societyId: string, title: string, body: string, link: string) {
  const recipients = await filterRecipientsByPref(societyId, stakeholders, "helpdesk");
  if (!recipients.length) return;
  await db.insert(notifications).values(recipients.map((s) => ({
    id: randomUUID(), userId: s.userId, societyId, title, body, type: "helpdesk" as const, link, createdAt: new Date(),
  })));
}

export async function changeResidentTicket(ctx: ResidentContext, id: string, input: unknown) {
  const parsed = ticketChange.safeParse(input);
  if (!parsed.success) return { status: 400, error: "Check your reply, reason, or rating and try again." } as const;
  const change = parsed.data;
  const now = new Date();
  const scope = and(eq(helpdeskTickets.id, id), eq(helpdeskTickets.unitId, ctx.unit.id), eq(helpdeskTickets.societyId, ctx.society.id));
  const result = db.transaction((tx) => {
    const ticket = tx.select().from(helpdeskTickets).where(scope).get();
    if (!ticket) return { status: 404, error: "Request not found." } as const;
    const finished = ticket.status === "resolved" || ticket.status === "closed";
    if (change.action === "reply" ? finished : !finished) {
      return { status: 409, error: "This request has changed. Refresh it and try again." } as const;
    }
    if (change.action === "rate") {
      if (ticket.rating !== null) return { status: 409, error: "Feedback has already been submitted." } as const;
      tx.update(helpdeskTickets).set({ rating: change.rating, feedback: change.feedback || null, status: "closed", updatedAt: now }).where(scope).run();
    } else {
      tx.insert(ticketComments).values({
        id: randomUUID(), ticketId: id, authorId: ctx.user.id,
        body: change.action === "reopen" ? `Reopened: ${change.reason}` : change.body,
        internal: false, createdAt: now,
      }).run();
      if (change.action === "reopen") {
        const hours = slaHoursForPriority(ticket.priority, ctx.society.settings?.helpdeskSlaHours ?? 24);
        tx.update(helpdeskTickets).set({
          status: "reopened", resolvedAt: null, reopenedCount: ticket.reopenedCount + 1, updatedAt: now,
          slaDueAt: new Date(now.getTime() + hours * 3600 * 1000),
        }).where(scope).run();
      } else {
        tx.update(helpdeskTickets).set({ updatedAt: now }).where(scope).run();
      }
    }
    return { ticket } as const;
  }, { behavior: "immediate" });

  if ("error" in result) return result;
  if (change.action !== "rate") {
    const { ticket } = result;
    const recipients = change.action === "reply" && ticket.assigneeId
      ? [{ userId: ticket.assigneeId }]
      : await db.select({ userId: memberships.userId }).from(memberships).where(and(
          eq(memberships.societyId, ctx.society.id), eq(memberships.status, "active"),
          inArray(memberships.role, ["helpdesk_manager", "manager", "admin"]),
        ));
    const reopened = change.action === "reopen";
    await notifyTicket(recipients, ctx.society.id, reopened ? "A ticket was reopened" : "New reply on a helpdesk request",
      reopened ? `${ctx.user.name} reopened: ${ticket.subject}.` : `${ctx.user.name} replied on ${ticket.subject}.`, `/admin/helpdesk/${id}`);
  }
  revalidatePath(`/app/helpdesk/${id}`);
  revalidatePath("/app/helpdesk");
  revalidatePath("/admin/helpdesk");
  return { ok: true } as const;
}
