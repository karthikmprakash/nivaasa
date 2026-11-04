import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";

function csvEscape(v: string | number | null | undefined) {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId) return new Response("Unauthorized", { status: 401 });
  const [inv, pay] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.unitId, session.membership.unitId)).orderBy(desc(invoices.issueDate)),
    db.select().from(payments).where(eq(payments.unitId, session.membership.unitId)).orderBy(desc(payments.paidAt)),
  ]);
  const lines: string[][] = [["Type", "Reference", "Title", "Period", "Due date", "Total (INR)", "Paid (INR)", "Status", "Method", "Paid on"]];
  for (const i of inv) lines.push(["Invoice", i.number, i.title, `${i.periodStart} to ${i.periodEnd}`, i.dueDate, (i.total / 100).toFixed(2), (i.amountPaid / 100).toFixed(2), i.status, "", ""]);
  for (const p of pay) lines.push(["Payment", p.receiptNo, "", "", "", "", (p.amount / 100).toFixed(2), p.status, p.method, p.paidAt.toISOString().slice(0, 10)]);
  const csv = lines.map((r) => r.map(csvEscape).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nivaasa-statement-${session.membership.unitId.slice(0, 6)}.csv"` } });
}
