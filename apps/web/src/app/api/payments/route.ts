import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, invoices, memberships, notifications, payments } from "@/db/schema";
import { getSession, isAdminRole } from "@/lib/auth";
import { filterRecipientsByPref } from "@/lib/notifications";
import { todayISO } from "@/lib/utils";

const schema = z.object({
  invoiceId: z.string().optional(),
  amount: z.number().int().positive().optional(),
  method: z.enum(["upi", "card", "netbanking"]).default("upi"),
  reference: z.string().max(120).optional(),
  advance: z.boolean().optional(),
  note: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  const { invoiceId, method, reference, advance, note } = parsed.data;

  const [invoice] = invoiceId
    ? await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.societyId, session.membership.societyId))).limit(1)
    : [];
  if (invoiceId && !invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (invoice) {
    const isOwner = session.membership.unitId === invoice.unitId;
    const isAdmin = isAdminRole(session.membership.role);
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "This invoice belongs to another home." }, { status: 403 });
    if (invoice.status === "paid") return NextResponse.json({ error: "This invoice is already paid." }, { status: 409 });
    if (invoice.status === "cancelled") return NextResponse.json({ error: "This invoice has been cancelled." }, { status: 409 });
    const [pendingPayment] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.invoiceId, invoice.id), eq(payments.status, "pending"))).limit(1);
    if (pendingPayment) return NextResponse.json({ error: "A payment for this invoice is already awaiting verification." }, { status: 409 });
  }
  if (!invoice && !advance) return NextResponse.json({ error: "Choose an invoice or an advance payment." }, { status: 400 });
  if (advance && !session.membership.unitId) return NextResponse.json({ error: "No flat linked to this account." }, { status: 400 });

  const outstanding = invoice ? invoice.total - invoice.amountPaid : 0;
  const amount = invoice ? (parsed.data.amount ?? outstanding) : (parsed.data.amount ?? 0);
  if (invoice && amount > outstanding) return NextResponse.json({ error: "Amount is more than the outstanding balance." }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  if (amount > 500000000) return NextResponse.json({ error: "For amounts above ₹50 lakh, please use bank transfer." }, { status: 400 });

  const [{ c }] = await db.select({ c: sql<number>`count(*)` }).from(payments).where(eq(payments.societyId, session.membership.societyId));
  const receiptNo = `RCPT-${todayISO().slice(0, 4)}-${String((c ?? 0) + 1).padStart(5, "0")}`;
  const paymentId = crypto.randomUUID();
  const now = new Date();
  const referenceNo = reference || (method === "upi" ? `UPI/${Date.now()}` : method === "card" ? `CARD/${Date.now()}` : `${method.toUpperCase()}/${Date.now()}`);
  await db.insert(payments).values({
    id: paymentId, societyId: session.membership.societyId, unitId: invoice?.unitId ?? session.membership.unitId ?? "",
    invoiceId: invoice?.id ?? null, userId: session.user.id, receiptNo, kind: advance ? "advance" : "invoice", amount, method,
    reference: referenceNo, status: "success", note: note ?? (advance ? "Advance payment" : "Paid via Nivaasa demo gateway"),
    paidAt: now, createdAt: now,
  });

  if (invoice) {
    const amountPaid = invoice.amountPaid + amount;
    const status = amountPaid >= invoice.total ? "paid" : "partially_paid";
    await db.update(invoices).set({ amountPaid, status }).where(eq(invoices.id, invoice.id));
  }

  const admins = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, session.membership.societyId), eq(memberships.status, "active"), inArray(memberships.role, ["admin", "manager", "accountant"])));
  if (admins.length) {
    await db.insert(notifications).values(admins.map((a) => ({
      id: crypto.randomUUID(), userId: a.userId, societyId: session.membership!.societyId,
      title: "Payment received", body: `${session.user.name} paid ₹${(amount / 100).toLocaleString("en-IN")}${invoice ? ` for ${invoice.title}` : " as advance"}. Receipt ${receiptNo}.`, type: "payment" as const, link: "/admin/billing", createdAt: now,
    })));
  }
  const [selfRecipient] = await filterRecipientsByPref(session.membership.societyId, [{ userId: session.user.id }], "payments");
  if (selfRecipient) await db.insert(notifications).values({
    id: crypto.randomUUID(), userId: session.user.id, societyId: session.membership.societyId,
    title: "Payment successful — receipt ready", body: `₹${(amount / 100).toLocaleString("en-IN")} received. Your receipt number is ${receiptNo}.`, type: "payment", link: "/app/payments", createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: session.membership.societyId, actorId: session.user.id, actorName: session.user.name,
    action: "payment.success", entity: "payment", entityId: paymentId,
    metadata: { amount, method, invoiceId: invoice?.id ?? null, receiptNo }, createdAt: now,
  });
  revalidatePath("/app");
  revalidatePath("/app/payments");
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  return NextResponse.json({ ok: true, receiptNo, paymentId });
}
