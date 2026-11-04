"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs, billingHeads, expenses, invoices, invoiceItems, memberships, notifications, payments, units, vendors,
} from "@/db/schema";
import { requireAdmin } from "@/lib/queries";
import { canManageBilling } from "@/lib/auth";
import { filterRecipientsByPref } from "@/lib/notifications";
import { communityDayEnd, communityDayStart } from "@/lib/datetime";
import { todayISO } from "@/lib/utils";

export type BillingState = { error?: string; ok?: boolean; count?: number; message?: string };

function canBill(role?: string | null, superAdmin = false) {
  return superAdmin || canManageBilling(role);
}

async function nextInvoiceSequence(societyId: string) {
  const rows = await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.societyId, societyId));
  let max = 0;
  for (const r of rows) {
    const n = Number(r.number.split("/").pop());
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return max + 1;
}

export async function runBilling(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const ctx = await requireAdmin();
  const role = ctx.membership?.role;
  if (!ctx.society || !canBill(role, ctx.user.globalRole === "super_admin")) return { error: "You don't have billing access." };
  const society = ctx.society;
  const societyId = society.id;

  const title = String(formData.get("title") ?? "").trim() || "Monthly Maintenance";
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");
  const issueDate = String(formData.get("issueDate") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const headIds = formData.getAll("headIds").map(String);
  if (!periodStart || !periodEnd || !issueDate || !dueDate) return { error: "Choose the billing period and dates." };
  const periodStartBoundary = communityDayStart(periodStart);
  const periodEndBoundary = communityDayEnd(periodEnd);
  const issueBoundary = communityDayStart(issueDate);
  const dueBoundary = communityDayEnd(dueDate);
  if (!periodStartBoundary || !periodEndBoundary || !issueBoundary || !dueBoundary) return { error: "Choose valid billing dates." };
  if (periodEndBoundary < periodStartBoundary) return { error: "The billing period must end on or after it starts." };
  if (dueBoundary < issueBoundary) return { error: "The due date must be after the issue date." };
  if (!headIds.length) return { error: "Select at least one billing head." };

  const heads = await db.select().from(billingHeads).where(and(eq(billingHeads.societyId, societyId), inArray(billingHeads.id, headIds), eq(billingHeads.active, true)));
  if (!heads.length) return { error: "No active billing heads selected." };

  const includeVacant = formData.get("includeVacant") === "on";
  const allUnits = await db.select().from(units).where(eq(units.societyId, societyId));
  const residentUnitRows = await db.selectDistinct({ unitId: memberships.unitId }).from(memberships).where(and(
    eq(memberships.societyId, societyId),
    eq(memberships.status, "active"),
    inArray(memberships.role, ["owner", "tenant", "committee", "family"]),
  ));
  const residentUnitIds = new Set(residentUnitRows.map((row) => row.unitId).filter((id): id is string => !!id));
  const existing = await db.select({ unitId: invoices.unitId }).from(invoices).where(and(eq(invoices.societyId, societyId), eq(invoices.periodStart, periodStart), inArray(invoices.status, ["due", "overdue", "partially_paid", "paid"])));
  const existingSet = new Set(existing.map((e) => e.unitId));
  const targetUnits = allUnits.filter((u) => (includeVacant || u.status === "occupied" || residentUnitIds.has(u.id)) && !existingSet.has(u.id));
  if (!targetUnits.length) return { error: existingSet.size ? "Invoices already exist for this period. Choose a different period." : "There are no occupied homes to bill. Add residents first, or choose to include vacant homes." };

  let seq = await nextInvoiceSequence(societyId);
  const now = new Date();
  let count = 0;
  for (const unit of targetUnits) {
    const items = heads.map((h) => {
      let amount = h.defaultAmount;
      if (h.basis === "per_sqft") amount = unit.areaSqft * h.defaultAmount;
      if (h.basis === "per_unit") amount = unit.parkingSlots * h.defaultAmount;
      return { head: h, amount };
    });
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const gstAmount = items.reduce((sum, item) => sum + Math.round(item.amount * item.head.gstRate / 100), 0);
    const invoiceId = crypto.randomUUID();
    const prefix = society.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const issueYear = Number(issueDate.slice(0, 4));
    const issueMonth = Number(issueDate.slice(5, 7));
    const fiscalYear = issueMonth >= 4 ? issueYear : issueYear - 1;
    const number = `${prefix}/${fiscalYear}-${String(fiscalYear + 1).slice(-2)}/${String(seq++).padStart(4, "0")}`;
    await db.insert(invoices).values({
      id: invoiceId, societyId: societyId, unitId: unit.id, number, title,
      periodStart, periodEnd, issueDate, dueDate, subtotal, gstAmount, penalty: 0, discount: 0,
      total: subtotal + gstAmount, amountPaid: 0, status: "due", createdBy: ctx.user.id, createdAt: now,
    });
    await db.insert(invoiceItems).values(items.map((i) => ({
      id: crypto.randomUUID(), invoiceId, headId: i.head.id, description: i.head.name,
      quantity: i.head.basis === "per_sqft" ? unit.areaSqft : i.head.basis === "per_unit" ? unit.parkingSlots : 1,
      rate: i.head.defaultAmount, amount: i.amount,
    })));
    count++;
  }

  // In-app notice to every resident with a flat who still wants payment updates.
  const residentRows = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, societyId), eq(memberships.status, "active"), isNotNull(memberships.unitId), inArray(memberships.role, ["owner", "tenant", "committee"])));
  const residents = await filterRecipientsByPref(societyId, residentRows, "payments");
  if (residents.length) {
    await db.insert(notifications).values(residents.map((r) => ({
      id: crypto.randomUUID(), userId: r.userId, societyId: societyId,
      title: `${title} invoice is ready`, body: `Your invoice for ${periodStart} – ${periodEnd} is available. Due ${dueDate}.`, type: "payment" as const, link: "/app/payments", createdAt: now,
    })));
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: societyId, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "invoice.run.created", entity: "invoice", metadata: { count, periodStart, periodEnd, heads: heads.map((h) => h.name) }, createdAt: now,
  });
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  revalidatePath("/app/payments");
  return { ok: true, count, message: `${count} invoices created for ${periodStart} – ${periodEnd}.` };
}

export async function applyLateFees(_prev: BillingState, _formData: FormData): Promise<BillingState> {
  const ctx = await requireAdmin();
  const role = ctx.membership?.role;
  if (!ctx.society || !canBill(role, ctx.user.globalRole === "super_admin")) return { error: "You don't have billing access." };
  const societyId = ctx.society.id;
  const lateFeePercent = Math.max(0, ctx.society.settings?.lateFeePercent ?? 2);
  const graceDays = Math.max(0, ctx.society.settings?.graceDays ?? 5);
  if (!lateFeePercent) return { error: "Set a late fee percentage in Society settings first." };
  const cutoff = todayISO(-graceDays);
  const candidates = await db.select().from(invoices).where(and(
    eq(invoices.societyId, societyId),
    inArray(invoices.status, ["due", "partially_paid"]),
    lt(invoices.dueDate, cutoff),
    eq(invoices.penalty, 0),
  ));
  const eligible = candidates.filter((invoice) => invoice.total > invoice.amountPaid);
  if (!eligible.length) return { error: "No unpaid invoices are past the grace period right now." };

  const now = new Date();
  const updated: { invoice: (typeof eligible)[number]; penalty: number }[] = [];
  for (const invoice of eligible) {
    const penalty = Math.round((invoice.total - invoice.amountPaid) * lateFeePercent / 100);
    if (penalty <= 0) continue;
    await db.update(invoices).set({ penalty: invoice.penalty + penalty, total: invoice.total + penalty, status: "overdue" }).where(eq(invoices.id, invoice.id));
    updated.push({ invoice, penalty });
  }
  if (!updated.length) return { error: "No invoices needed a late fee." };

  const unitIds = [...new Set(updated.map(({ invoice }) => invoice.unitId))];
  const residents = await db.select({ userId: memberships.userId, unitId: memberships.unitId }).from(memberships).where(and(
    eq(memberships.societyId, societyId),
    eq(memberships.status, "active"),
    inArray(memberships.unitId, unitIds),
  ));
  const recipients = await filterRecipientsByPref(societyId, residents.map((resident) => ({ userId: resident.userId })), "payments");
  const allowed = new Set(recipients.map((recipient) => recipient.userId));
  const notificationsToSend = updated.flatMap(({ invoice, penalty }) => residents
    .filter((resident) => resident.unitId === invoice.unitId && allowed.has(resident.userId))
    .map((resident) => ({
      id: crypto.randomUUID(), userId: resident.userId, societyId,
      title: `Late fee added to ${invoice.number}`,
      body: `A ${lateFeePercent}% late fee of ₹${(penalty / 100).toLocaleString("en-IN")} was applied because the invoice was unpaid ${graceDays} days after its due date.`,
      type: "payment" as const, link: "/app/payments", createdAt: now,
    })));
  if (notificationsToSend.length) await db.insert(notifications).values(notificationsToSend);

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "invoice.late_fees.applied", entity: "invoice",
    metadata: { count: updated.length, lateFeePercent, graceDays, penalties: updated.reduce((total, item) => total + item.penalty, 0) }, createdAt: now,
  });
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  revalidatePath("/app/payments");
  revalidatePath("/app");
  return { ok: true, count: updated.length, message: `${updated.length} invoices updated with a ${lateFeePercent}% late fee.` };
}

export type ExpenseState = { error?: string; ok?: boolean };

export async function createExpense(_prev: ExpenseState, formData: FormData): Promise<ExpenseState> {
  const ctx = await requireAdmin();
  if (!ctx.society || !canBill(ctx.membership?.role, ctx.user.globalRole === "super_admin")) return { error: "You don't have permission to record expenses." };
  const societyId = ctx.society.id;
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim();
  const amountRupees = Number(formData.get("amount") ?? 0);
  const date = String(formData.get("date") ?? "");
  const vendorId = String(formData.get("vendorId") ?? "") || null;
  const statusValue = String(formData.get("status") ?? "paid");
  if (!["pending", "approved", "paid"].includes(statusValue)) return { error: "Choose a valid expense status." };
  const status = statusValue as "pending" | "approved" | "paid";
  if (!description) return { error: "Add a description." };
  if (!Number.isFinite(amountRupees) || amountRupees <= 0) return { error: "Enter a valid amount." };
  if (!communityDayStart(date)) return { error: "Choose a valid expense date." };
  if (vendorId) {
    const [vendor] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.societyId, societyId))).limit(1);
    if (!vendor) return { error: "Choose a vendor from this society." };
  }
  const now = new Date();
  await db.insert(expenses).values({
    id: crypto.randomUUID(), societyId: societyId, vendorId, category, description,
    amount: Math.round(amountRupees * 100), date, status, approvedBy: ctx.user.id, createdAt: now,
  });
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: societyId, actorId: ctx.user.id, actorName: ctx.user.name,
    action: "expense.created", entity: "expense", metadata: { description, amount: amountRupees, category }, createdAt: now,
  });
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  return { ok: true };
}

export async function verifyPayment(formData: FormData) {
  const ctx = await requireAdmin();
  if (!ctx.society || !canBill(ctx.membership?.role, ctx.user.globalRole === "super_admin")) return;
  const societyId = ctx.society.id;
  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "approve");
  const [payment] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.societyId, societyId))).limit(1);
  if (!payment || payment.status !== "pending") return;
  const now = new Date();
  if (decision === "reject") {
    await db.update(payments).set({ status: "rejected", verifiedBy: ctx.user.id, note: payment.note }).where(eq(payments.id, paymentId));
    const [recipient] = payment.userId ? await filterRecipientsByPref(societyId, [{ userId: payment.userId }], "payments") : [];
    if (recipient) await db.insert(notifications).values({
      id: crypto.randomUUID(), userId: payment.userId!, societyId: societyId,
      title: "Payment intimation rejected", body: `We couldn't verify the ${payment.method.toUpperCase()} payment of ₹${(payment.amount / 100).toLocaleString("en-IN")}. Please check the reference and try again.`, type: "payment", link: "/app/payments", createdAt: now,
    });
  } else {
    await db.update(payments).set({ status: "success", verifiedBy: ctx.user.id }).where(eq(payments.id, paymentId));
    if (payment.invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).limit(1);
      if (inv) {
        const amountPaid = inv.amountPaid + payment.amount;
        const status = amountPaid >= inv.total ? "paid" : amountPaid > 0 ? "partially_paid" : inv.status;
        await db.update(invoices).set({ amountPaid, status }).where(eq(invoices.id, inv.id));
      }
    }
    const [recipient] = payment.userId ? await filterRecipientsByPref(societyId, [{ userId: payment.userId }], "payments") : [];
    if (recipient) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(), userId: payment.userId!, societyId: societyId,
        title: "Payment verified — receipt ready", body: `Your ${payment.method.toUpperCase()} payment of ₹${(payment.amount / 100).toLocaleString("en-IN")} has been verified. Receipt ${payment.receiptNo}.`, type: "payment", link: "/app/payments", createdAt: now,
      });
    }
  }
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: societyId, actorId: ctx.user.id, actorName: ctx.user.name,
    action: `payment.${decision === "reject" ? "rejected" : "verified"}`, entity: "payment", entityId: payment.id,
    metadata: { amount: payment.amount, receiptNo: payment.receiptNo }, createdAt: now,
  });
  revalidatePath("/admin/billing");
  revalidatePath("/app/payments");
  revalidatePath("/app");
}

export async function createBillingHead(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager", "accountant"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const societyId = ctx.society.id;
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase() || name.slice(0, 3).toUpperCase();
  const basisValue = String(formData.get("basis") ?? "fixed");
  if (!["fixed", "per_sqft", "per_unit"].includes(basisValue)) return { error: "Choose a valid billing basis." };
  const basis = basisValue as "fixed" | "per_sqft" | "per_unit" | "meter";
  const amount = Number(formData.get("amount") ?? 0);
  if (!name) return { error: "Give the billing head a name." };
  if (!Number.isFinite(amount) || amount < 0) return { error: "Enter a valid amount." };
  const gstRate = Math.max(0, Math.min(28, Number(formData.get("gstRate") ?? 0) || 0));
  await db.insert(billingHeads).values({ id: crypto.randomUUID(), societyId: societyId, name, code, basis, defaultAmount: Math.round(amount * 100), gstRate, recurring: true, active: true, sortOrder: 99 });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId, actorId: ctx.user.id, actorName: ctx.user.name, action: "billing_head.created", entity: "billing_head", metadata: { name, code, basis, amount, gstRate }, createdAt: new Date() });
  revalidatePath("/admin/billing");
  return { ok: true, message: "Billing head added." };
}

export async function addVendor(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const ctx = await requireAdmin();
  if (!ctx.society || (ctx.user.globalRole !== "super_admin" && !["admin", "manager", "accountant", "committee"].includes(ctx.membership?.role ?? ""))) return { error: "Permission denied." };
  const societyId = ctx.society.id;
  const name = String(formData.get("name") ?? "").trim();
  const monthlyValue = Number(formData.get("monthlyValue") ?? 0);
  if (!name) return { error: "Enter the vendor name." };
  if (!Number.isFinite(monthlyValue) || monthlyValue < 0) return { error: "Enter a valid monthly value." };
  await db.insert(vendors).values({
    id: crypto.randomUUID(), societyId: societyId, name, category: String(formData.get("category") ?? "Services"),
    contactPerson: String(formData.get("contactPerson") ?? "") || null, phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null, gstin: String(formData.get("gstin") ?? "") || null,
    contractStart: String(formData.get("contractStart") ?? "") || null, contractEnd: String(formData.get("contractEnd") ?? "") || null,
    monthlyValue: Math.round(monthlyValue * 100), status: "active", createdAt: new Date(),
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId, actorId: ctx.user.id, actorName: ctx.user.name, action: "vendor.created", entity: "vendor", metadata: { name, category: String(formData.get("category") ?? "Services") }, createdAt: new Date() });
  revalidatePath("/admin/vendors");
  return { ok: true, message: "Vendor added." };
}
