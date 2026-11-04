import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, invoices, memberships, notifications, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { communityDayStart } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";

const schema = z.object({
  invoiceId: z.string(),
  method: z.enum(["cash", "cheque", "neft", "upi"]),
  reference: z.string().max(120).optional(),
  paidOn: z.string().max(20).optional(),
  note: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, parsed.data.invoiceId), eq(invoices.societyId, session.membership.societyId))).limit(1);
  if (!invoice || invoice.unitId !== session.membership.unitId) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
  if (invoice.status === "cancelled") return NextResponse.json({ error: "This invoice has been cancelled." }, { status: 409 });
  const paidOn = parsed.data.paidOn ? communityDayStart(parsed.data.paidOn) : null;
  if (parsed.data.paidOn && (!paidOn || parsed.data.paidOn > todayISO())) {
    return NextResponse.json({ error: "Choose a valid payment date." }, { status: 400 });
  }
  const [pending] = await db.select().from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "pending"))).limit(1);
  if (pending) return NextResponse.json({ error: "You already have a payment awaiting verification for this invoice." }, { status: 409 });
  const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(payments).where(eq(payments.societyId, session.membership.societyId));
  const receiptNo = `RCPT-${todayISO().slice(0, 4)}-${String((c ?? 0) + 1).padStart(5, "0")}`;
  const now = new Date();
  const amount = invoice.total - invoice.amountPaid;
  await db.insert(payments).values({
    id: crypto.randomUUID(), societyId: session.membership.societyId, unitId: invoice.unitId, invoiceId: invoice.id,
    userId: session.user.id, receiptNo, amount, method: parsed.data.method, reference: parsed.data.reference ?? null,
    status: "pending", note: parsed.data.note ?? "Offline payment intimation", paidAt: paidOn ?? now, createdAt: now,
  });
  const admins = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, session.membership.societyId), eq(memberships.status, "active"), inArray(memberships.role, ["accountant", "admin", "manager"])));
  if (admins.length) {
    await db.insert(notifications).values(admins.map((a) => ({
      id: crypto.randomUUID(), userId: a.userId, societyId: session.membership!.societyId,
      title: "Offline payment needs verification", body: `${session.user.name} recorded a ${parsed.data.method.toUpperCase()} payment of ₹${(amount / 100).toLocaleString("en-IN")} for ${invoice.title}.`, type: "payment" as const, link: "/admin/billing", createdAt: now,
    })));
  }
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: session.membership.societyId, actorId: session.user.id, actorName: session.user.name,
    action: "payment.intimated", entity: "payment", entityId: receiptNo,
    metadata: { invoice: invoice.number, amount, method: parsed.data.method, reference: parsed.data.reference ?? null }, createdAt: now,
  });
  return NextResponse.json({ ok: true, receiptNo });
}
