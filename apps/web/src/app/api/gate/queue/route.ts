import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { units, users, visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";

export async function GET() {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ visitor: visitors, unit: units.number, hostName: users.name, hostPhone: users.phone }).from(visitors).leftJoin(units, eq(visitors.unitId, units.id)).leftJoin(users, eq(visitors.hostUserId, users.id)).where(and(eq(visitors.societyId, session.society!.id), eq(visitors.preApproved, false), eq(visitors.leaveAtGate, false), inArray(visitors.status, ["pending", "approved"]), gte(visitors.createdAt, new Date(Date.now() - 24 * 3600 * 1000)))).orderBy(desc(visitors.createdAt)).limit(30);
  return NextResponse.json({ items: rows.map((r) => ({ ...r.visitor, unit: r.unit, hostName: r.hostName, hostPhone: r.hostPhone })) });
}
