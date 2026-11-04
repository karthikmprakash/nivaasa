import type { Metadata } from "next";
import { and, eq, inArray, sql } from "drizzle-orm";
import { AdminShell } from "@/components/shell/admin-shell";
import { db } from "@/db";
import { helpdeskTickets, payments, visitors } from "@/db/schema";
import { getSocietyOptions, getUnreadCount, requireAdmin } from "@/lib/queries";
import { escalateOverdueTickets } from "@/lib/helpdesk-escalation";

export const metadata: Metadata = { title: "Admin console" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const society = ctx.society!;
  const societies = await getSocietyOptions(ctx);
  await escalateOverdueTickets(society.id);
  const [ticketRows, visitorRows, paymentRows, unread] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(helpdeskTickets).where(and(eq(helpdeskTickets.societyId, society.id), inArray(helpdeskTickets.status, ["open", "assigned", "in_progress", "reopened"]))),
    db.select({ count: sql<number>`count(*)` }).from(visitors).where(and(eq(visitors.societyId, society.id), eq(visitors.status, "pending"))),
    db.select({ count: sql<number>`count(*)` }).from(payments).where(and(eq(payments.societyId, society.id), eq(payments.status, "pending"))),
    getUnreadCount(ctx.user.id, society.id),
  ]);
  return (
    <AdminShell
      user={{ name: ctx.user.name, email: ctx.user.email, avatarColor: ctx.user.avatarColor }}
      society={{ name: society.name, city: society.city }}
      societies={societies}
      currentSocietyId={society.id}
      role={ctx.membership?.role ?? "super_admin"}
      counts={{ tickets: ticketRows[0]?.count ?? 0, visitors: visitorRows[0]?.count ?? 0, payments: paymentRows[0]?.count ?? 0 }}
      unread={unread}
      hasUnit={!!ctx.unit}
      isSuper={ctx.user.globalRole === "super_admin"}
      demo={process.env.NEXT_PUBLIC_DEMO_MODE !== "false"}
    >
      {children}
    </AdminShell>
  );
}
