import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditLogs, notifications, visitors } from "@/db/schema";
import { gateSession, residentsOfUnit } from "@/lib/gate";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [v] = await db.select().from(visitors).where(and(eq(visitors.id, id), eq(visitors.societyId, session.society!.id))).limit(1);
  if (!v) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
  if (v.status !== "approved") return NextResponse.json({ error: "Resident approval is pending." }, { status: 409 });
  const now = new Date();
  await db.update(visitors).set({ status: "entered", enteredAt: now, guardId: session.user.id }).where(eq(visitors.id, id));
  const hosts = await residentsOfUnit(v.unitId!, session.society!.id);
  if (hosts.length) await db.insert(notifications).values(hosts.map((h) => ({ id: crypto.randomUUID(), userId: h.userId, societyId: session.society!.id, title: `${v.name} entered the community`, body: "Recorded at Gate 1.", type: "security" as const, link: "/app/visitors", createdAt: now })));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id, actorName: session.user.name, action: "visitor.entered", entity: "visitor", entityId: id, metadata: { name: v.name }, createdAt: now });
  revalidatePath("/gate"); revalidatePath("/app/visitors"); revalidatePath("/admin/security");
  return NextResponse.json({ ok: true });
}
