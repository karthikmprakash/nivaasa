import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { helpdeskTickets, invoices, memberships, payments, towers, units, users, visitors } from "@/db/schema";
import { getSession, isAdminRole } from "@/lib/auth";

function esc(v: unknown) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function csv(rows: unknown[][]) { return rows.map((r) => r.map(esc).join(",")).join("\n"); }

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.membership || !isAdminRole(session.membership.role)) return new Response("Unauthorized", { status: 401 });
  const societyId = session.membership.societyId;
  const type = new URL(req.url).searchParams.get("type") ?? "residents";
  let rows: unknown[][] = [];
  let name = type;
  if (type === "residents") {
    rows = [["Home", "Tower", "Type", "Area sqft", "Resident", "Role", "Phone", "Email", "Status"]];
    const data = await db.select({ m: memberships, u: users, unit: units, tower: towers }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).leftJoin(units, eq(memberships.unitId, units.id)).leftJoin(towers, eq(units.towerId, towers.id)).where(eq(memberships.societyId, societyId)).orderBy(units.number);
    for (const d of data) rows.push([d.unit?.number, d.tower?.name ?? "", d.unit?.unitType ?? "", d.unit?.areaSqft ?? "", d.u.name, d.m.role, d.u.phone, d.u.email, d.m.status]);
  } else if (type === "invoices") {
    rows = [["Invoice", "Home", "Title", "Issued", "Due", "Total INR", "Paid INR", "Status"]];
    const data = await db.select({ invoice: invoices, unit: units }).from(invoices).innerJoin(units, eq(invoices.unitId, units.id)).where(eq(invoices.societyId, societyId)).orderBy(desc(invoices.issueDate));
    for (const d of data) rows.push([d.invoice.number, d.unit.number, d.invoice.title, d.invoice.issueDate, d.invoice.dueDate, (d.invoice.total / 100).toFixed(2), (d.invoice.amountPaid / 100).toFixed(2), d.invoice.status]);
  } else if (type === "payments") {
    rows = [["Receipt", "Home", "Amount INR", "Method", "Status", "Paid on", "Reference"]];
    const data = await db.select({ p: payments, unit: units }).from(payments).leftJoin(units, eq(payments.unitId, units.id)).where(eq(payments.societyId, societyId)).orderBy(desc(payments.createdAt));
    for (const d of data) rows.push([d.p.receiptNo, d.unit?.number, (d.p.amount / 100).toFixed(2), d.p.method, d.p.status, d.p.paidAt.toISOString().slice(0, 10), d.p.reference]);
  } else if (type === "tickets") {
    rows = [["ID", "Home", "Category", "Subject", "Priority", "Status", "Created"]];
    const data = await db.select({ t: helpdeskTickets, unit: units }).from(helpdeskTickets).leftJoin(units, eq(helpdeskTickets.unitId, units.id)).where(eq(helpdeskTickets.societyId, societyId)).orderBy(desc(helpdeskTickets.createdAt));
    for (const d of data) rows.push([d.t.id.slice(0, 8), d.unit?.number, d.t.category, d.t.subject, d.t.priority, d.t.status, d.t.createdAt.toISOString()]);
  } else if (type === "visitors") {
    rows = [["Visitor", "Home", "Type", "Company", "Status", "Created"]];
    const data = await db.select({ v: visitors, unit: units }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).where(eq(visitors.societyId, societyId)).orderBy(desc(visitors.createdAt));
    for (const d of data) rows.push([d.v.name, d.unit?.number, d.v.type, d.v.company, d.v.status, d.v.createdAt.toISOString()]);
  } else {
    return new Response("Unknown export type", { status: 400 });
  }
  return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nivaasa-${name}.csv"` } });
}
