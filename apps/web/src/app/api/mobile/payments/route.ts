import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unitId = session.membership.unitId;
  const [invoiceRows, paymentRows, advanceRows] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.unitId, unitId)).orderBy(desc(invoices.issueDate)),
    db.select().from(payments).where(eq(payments.unitId, unitId)).orderBy(desc(payments.createdAt)),
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` }).from(payments).where(sql`${payments.unitId} = ${unitId} and ${payments.kind} = 'advance' and ${payments.status} = 'success'`),
  ]);
  return NextResponse.json({
    invoices: invoiceRows,
    payments: paymentRows,
    advance: advanceRows[0]?.total ?? 0,
    dues: invoiceRows.filter((i) => ["due", "overdue", "partially_paid"].includes(i.status)).reduce((s, i) => s + i.total - i.amountPaid, 0),
  });
}
