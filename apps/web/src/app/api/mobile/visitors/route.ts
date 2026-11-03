import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, staffAttendance, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unitId = session.membership.unitId;
  const [rows, help, attendance] = await Promise.all([
    db.select().from(visitors).where(eq(visitors.unitId, unitId)).orderBy(desc(visitors.createdAt)),
    db.select().from(staff).where(and(eq(staff.unitId, unitId), eq(staff.active, true))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.unitId, unitId), eq(staffAttendance.date, todayISO()))),
  ]);
  const now = new Date();
  return NextResponse.json({
    pending: rows.filter((v) => v.status === "pending"),
    passes: rows.filter((v) => v.preApproved && ["approved", "pending"].includes(v.status) && (!v.validTo || v.validTo >= now)),
    history: rows.filter((v) => !["pending"].includes(v.status) && !(v.preApproved && v.status === "approved")),
    help: help.map((s) => ({ ...s, attendance: attendance.find((a) => a.staffId === s.id) ?? null })),
  });
}
