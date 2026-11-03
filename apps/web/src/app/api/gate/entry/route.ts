import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, deliveries, notifications, units, users, visitors } from "@/db/schema";
import { gateSession, residentsOfUnit } from "@/lib/gate";
import { randomCode } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["guest", "delivery", "cab", "domestic_help", "vendor", "other"]),
  unitId: z.string(),
  name: z.string().min(1).max(80),
  phone: z.string().max(30).optional(),
  company: z.string().max(80).optional(),
  purpose: z.string().max(160).optional(),
  vehicleNo: z.string().max(30).optional(),
  code: z.string().max(10).optional(),
  notes: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the visitor details." }, { status: 400 });
  const d = parsed.data;
  const [unit] = await db.select().from(units).where(and(eq(units.id, d.unitId), eq(units.societyId, session.society!.id))).limit(1);
  if (!unit) return NextResponse.json({ error: "Choose a valid home." }, { status: 404 });
  const now = new Date();
  const hosts = await residentsOfUnit(unit.id, session.society!.id);

  if (d.code) {
    const [pass] = await db.select().from(visitors).where(and(eq(visitors.societyId, session.society!.id), eq(visitors.code, d.code), inArray(visitors.status, ["approved", "pending"]))).limit(1);
    if (!pass) return NextResponse.json({ error: "That passcode is not valid." }, { status: 404 });
    if (pass.status === "pending") return NextResponse.json({ error: "This visitor is still waiting for resident approval." }, { status: 409 });
    if (pass.validTo && pass.validTo < now) return NextResponse.json({ error: "This pass has expired." }, { status: 409 });
    await db.update(visitors).set({ status: "entered", enteredAt: now, guardId: session.user.id }).where(eq(visitors.id, pass.id));
    if (hosts.length) await db.insert(notifications).values(hosts.map((h) => ({ id: crypto.randomUUID(), userId: h.userId, societyId: session.society!.id, title: `${pass.name} entered the community`, body: `Verified with their passcode at Gate 1.`, type: "security" as const, link: "/app/visitors", createdAt: now })));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id, actorName: session.user.name, action: "visitor.entered", entity: "visitor", entityId: pass.id, metadata: { name: pass.name, code: true }, createdAt: now });
    revalidatePath("/gate");
    revalidatePath("/app/visitors");
    revalidatePath("/admin/security");
    return NextResponse.json({ ok: true, status: "entered", name: pass.name, unit: unit.number });
  }

  const code = randomCode(6);
  const visitorId = crypto.randomUUID();
  await db.insert(visitors).values({
    id: visitorId, societyId: session.society!.id, unitId: unit.id, hostUserId: hosts[0]?.userId ?? null, guardId: session.user.id,
    name: d.name, phone: d.phone || null, type: d.type, company: d.company || null, purpose: d.purpose || null,
    vehicleNo: d.vehicleNo || null, photoColor: "#e6ecff", status: "pending", code,
    notes: d.notes || null, createdAt: now,
  });
  if (d.type === "delivery") {
    await db.insert(deliveries).values({ id: crypto.randomUUID(), societyId: session.society!.id, unitId: unit.id, guardId: session.user.id, company: d.company || "Delivery", courierName: d.name, status: "arrived", otp: code, notes: d.notes || null, createdAt: now });
  }
  if (hosts.length) await db.insert(notifications).values(hosts.map((h) => ({ id: crypto.randomUUID(), userId: h.userId, societyId: session.society!.id, title: "Visitor waiting at the gate", body: `${d.name}${d.company ? ` (${d.company})` : ""} is at Gate 1 for ${unit.number}. Approve or deny from the app.`, type: "visitor" as const, link: "/app/visitors", createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id, actorName: session.user.name, action: "visitor.requested", entity: "visitor", entityId: visitorId, metadata: { name: d.name, type: d.type, unit: unit.number }, createdAt: now });
  revalidatePath("/gate");
  revalidatePath("/app");
  revalidatePath("/app/visitors");
  revalidatePath("/admin/security");
  return NextResponse.json({ ok: true, status: "pending", name: d.name, unit: unit.number });
}
