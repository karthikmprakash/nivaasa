import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, memberships, notifications, visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { randomCode } from "@/lib/utils";

const schema = z.object({ name: z.string().min(1).max(80), phone: z.string().max(30).optional(), type: z.enum(["guest", "delivery", "cab", "domestic_help", "vendor", "other"]), company: z.string().max(80).optional(), purpose: z.string().max(160).optional(), vehicleNo: z.string().max(30).optional(), date: z.string(), days: z.number().min(1).max(30).default(1), notes: z.string().max(300).optional(), leaveAtGate: z.boolean().optional() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership?.unitId || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the visitor details." }, { status: 400 });
  const d = parsed.data;
  const validFrom = new Date(`${d.date}T00:00:00`);
  const validTo = new Date(validFrom); validTo.setDate(validTo.getDate() + d.days); validTo.setHours(23, 59, 0, 0);
  const code = randomCode(6);
  const now = new Date();
  await db.insert(visitors).values({ id: crypto.randomUUID(), societyId: session.society.id, unitId: session.membership.unitId, hostUserId: session.user.id, name: d.name, phone: d.phone || null, type: d.type, company: d.company || null, purpose: d.purpose || null, vehicleNo: d.vehicleNo || null, photoColor: "#e6ecff", status: "approved", code, leaveAtGate: d.leaveAtGate ?? false, preApproved: true, validFrom, validTo, approvedAt: now, approvedBy: session.user.id, notes: d.notes || null, createdAt: now });
  const guards = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, session.society.id), inArray(memberships.role, ["guard", "security_manager"])));
  if (guards.length) await db.insert(notifications).values(guards.map((g) => ({ id: crypto.randomUUID(), userId: g.userId, societyId: session.society!.id, title: "Pre-approved visitor added", body: `${session.user.name} pre-approved ${d.name} for ${d.date}.`, type: "visitor" as const, link: "/gate", createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society.id, actorId: session.user.id, actorName: session.user.name, action: "visitor.pass.created", entity: "visitor", metadata: { name: d.name, days: d.days }, createdAt: now });
  return NextResponse.json({ ok: true, code });
}
