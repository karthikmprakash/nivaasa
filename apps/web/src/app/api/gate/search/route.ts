import { NextResponse } from "next/server";
import { and, eq, like as sqlLike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { memberships, units, users, visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";

export async function GET(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ residents: [], passes: [] });
  const pattern = `%${q}%`;
  const [residents, passes] = await Promise.all([
    db.select({ name: users.name, phone: users.phone, unit: units.number, unitId: units.id, role: memberships.role, color: users.avatarColor }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).innerJoin(units, eq(memberships.unitId, units.id)).where(and(eq(memberships.societyId, session.society!.id), eq(memberships.status, "active"), inArray(memberships.role, ["owner", "tenant", "committee", "family"]), or(sqlLike(users.name, pattern), sqlLike(units.number, pattern)))).limit(8),
    db.select({ id: visitors.id, name: visitors.name, company: visitors.company, type: visitors.type, code: visitors.code, unit: units.number, unitId: units.id, status: visitors.status, notes: visitors.notes, leaveAtGate: visitors.leaveAtGate }).from(visitors).innerJoin(units, eq(visitors.unitId, units.id)).where(and(eq(visitors.societyId, session.society!.id), eq(visitors.code, q), eq(visitors.preApproved, true), eq(visitors.status, "approved"))).limit(3),
  ]);
  return NextResponse.json({ residents, passes });
}
