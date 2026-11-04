import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditLogs, memberships, notifications, panicAlerts } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({ message: z.string().min(2).max(200), category: z.enum(["medical", "security", "fire", "other"]).default("security") });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid alert" }, { status: 400 });
  const [existing] = await db.select().from(panicAlerts).where(and(eq(panicAlerts.userId, session.user.id), eq(panicAlerts.societyId, session.membership.societyId), inArray(panicAlerts.status, ["open", "acknowledged"]))).limit(1);
  if (existing) return NextResponse.json({ error: "You already have an active alert. The guard is on the way." }, { status: 409 });
  const id = crypto.randomUUID();
  const now = new Date();
  const message = parsed.data.category === "medical" ? "Medical emergency — need help immediately" : parsed.data.category === "fire" ? "Fire emergency" : parsed.data.message;
  await db.insert(panicAlerts).values({ id, societyId: session.membership.societyId, userId: session.user.id, unitId: session.membership.unitId, message, status: "open", createdAt: now });
  const responders = await db.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.societyId, session.membership.societyId), eq(memberships.status, "active"), inArray(memberships.role, ["guard", "security_manager", "admin", "manager"])));
  if (responders.length) {
    await db.insert(notifications).values(responders.map((r) => ({
      id: crypto.randomUUID(), userId: r.userId, societyId: session.membership!.societyId,
      title: `PANIC ALERT · Home ${session.unit?.number ?? "—"} · ${session.user.name}`,
      body: `${message}. Raised by ${session.user.name} in Home ${session.unit?.number ?? "—"}. Respond immediately.`,
      type: "security" as const, link: "/gate", createdAt: now,
    })));
  }
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.membership.societyId, actorId: session.user.id, actorName: session.user.name, action: "panic.raised", entity: "panic_alert", entityId: id, metadata: { message }, createdAt: now });
  revalidatePath("/app/emergency");
  revalidatePath("/gate");
  revalidatePath("/admin/security");
  return NextResponse.json({ ok: true, id });
}
