import "server-only";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, helpdeskTickets, memberships, notifications } from "@/db/schema";
import { filterRecipientsByPref } from "@/lib/notifications";

const OPEN_STATUSES = ["open", "assigned", "in_progress", "reopened"] as const;

/**
 * Nivaasa has no background worker, so the admin layout runs this cheap sweep
 * whenever the console is opened. Audit logs double as the idempotency key so
 * the same breach is never escalated twice.
 */
export async function escalateOverdueTickets(societyId: string) {
  const now = new Date();
  const overdue = await db
    .select()
    .from(helpdeskTickets)
    .where(and(
      eq(helpdeskTickets.societyId, societyId),
      inArray(helpdeskTickets.status, OPEN_STATUSES),
      lt(helpdeskTickets.slaDueAt, now),
    ))
    .limit(50);
  if (!overdue.length) return;

  const ids = overdue.map((ticket) => ticket.id);
  const existing = await db
    .select({ entityId: auditLogs.entityId })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.societyId, societyId),
      eq(auditLogs.action, "helpdesk.escalated"),
      inArray(auditLogs.entityId, ids),
    ));
  const alreadyEscalated = new Set(existing.map((row) => row.entityId));
  const fresh = overdue.filter((ticket) => !alreadyEscalated.has(ticket.id));
  if (!fresh.length) return;

  const managers = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(
      eq(memberships.societyId, societyId),
      eq(memberships.status, "active"),
      inArray(memberships.role, ["helpdesk_manager", "manager", "admin"]),
    ));
  const uniqueManagers = [...new Map(managers.map((manager) => [manager.userId, manager])).values()];

  for (const ticket of fresh) {
    if (uniqueManagers.length) {
      await db.insert(notifications).values(uniqueManagers.map((manager) => ({
        id: crypto.randomUUID(),
        userId: manager.userId,
        societyId,
        title: `SLA breached · ${ticket.subject}`,
        body: `This ${ticket.priority}-priority request is past its response target. Review it and update the resident.`,
        type: "helpdesk" as const,
        link: `/admin/helpdesk/${ticket.id}`,
        createdAt: now,
      })));
    }

    const [resident] = await filterRecipientsByPref(societyId, [{ userId: ticket.raisedBy }], "helpdesk");
    if (resident) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: ticket.raisedBy,
        societyId,
        title: "Your request has been escalated",
        body: `“${ticket.subject}” is past its response target. We've escalated it to the community team and will update you shortly.`,
        type: "helpdesk",
        link: `/app/helpdesk/${ticket.id}`,
        createdAt: now,
      });
    }

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      societyId,
      actorId: null,
      actorName: "System",
      action: "helpdesk.escalated",
      entity: "ticket",
      entityId: ticket.id,
      metadata: { subject: ticket.subject, priority: ticket.priority, slaDueAt: ticket.slaDueAt?.toISOString() ?? null },
      createdAt: now,
    });
  }
}
