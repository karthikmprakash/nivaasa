import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, staffAttendance, users, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unitId = session.membership.unitId;
  const [records, help, attendance] = await Promise.all([
    db.select({ visitor: visitors, creatorName: users.name }).from(visitors)
      .leftJoin(users, eq(visitors.hostUserId, users.id))
      .where(eq(visitors.unitId, unitId)).orderBy(desc(visitors.createdAt)),
    db.select().from(staff).where(and(eq(staff.unitId, unitId), eq(staff.active, true), eq(staff.kind, "daily_help"))),
    db.select().from(staffAttendance).where(and(eq(staffAttendance.unitId, unitId), eq(staffAttendance.date, todayISO()))),
  ]);
  const rows = records.map(({ visitor, creatorName }) => ({ ...visitor, creatorName }));
  const now = new Date();
  return NextResponse.json({
    pending: rows.filter((v) => v.status === "pending"),
    passes: rows.filter((v) => v.preApproved && ["approved", "pending"].includes(v.status) && (!v.validTo || v.validTo >= now)),
    history: rows.filter((v) => ["entered", "exited", "denied", "expired"].includes(v.status) || (v.validTo && v.validTo < now)),
    help: help.map((s) => ({ ...s, attendance: attendance.find((a) => a.staffId === s.id) ?? null })),
  });
}
