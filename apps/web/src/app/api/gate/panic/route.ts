import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, notifications, panicAlerts } from "@/db/schema";
import { gateSession } from "@/lib/gate";

const schema = z.object({ id: z.string(), action: z.enum(["acknowledge", "resolve"]) });

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const [alert] = await db.select().from(panicAlerts).where(and(eq(panicAlerts.id, parsed.data.id), eq(panicAlerts.societyId, session.society!.id))).limit(1);
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  if (alert.status === "resolved") return NextResponse.json({ error: "This alert is already resolved." }, { status: 409 });
  const now = new Date();
  const status = parsed.data.action === "resolve" ? "resolved" : "acknowledged";
  await db.update(panicAlerts).set({ status, resolvedAt: status === "resolved" ? now : null, resolvedBy: session.user.id }).where(eq(panicAlerts.id, alert.id));
  if (alert.userId) {
    await db.insert(notifications).values({
      id: crypto.randomUUID(), userId: alert.userId, societyId: alert.societyId,
      title: status === "resolved" ? "Your emergency alert was resolved" : "Security acknowledged your alert",
      body: status === "resolved" ? "The community team has closed the alert. Please contact the office if you still need help." : `${session.user.name} is responding to your alert.`,
      type: "security", link: "/app/emergency", createdAt: now,
    });
  }
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(), societyId: alert.societyId, actorId: session.user.id, actorName: session.user.name,
    action: `panic.${status}`, entity: "panic_alert", entityId: alert.id, metadata: { message: alert.message }, createdAt: now,
  });
  revalidatePath("/gate"); revalidatePath("/admin/security"); revalidatePath("/app/emergency");
  return NextResponse.json({ ok: true });
}
