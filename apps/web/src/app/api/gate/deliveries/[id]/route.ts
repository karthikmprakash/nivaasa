import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { deliveries, notifications } from "@/db/schema";
import { gateSession, residentsOfUnit } from "@/lib/gate";
import { filterRecipientsByPref } from "@/lib/notifications";

const schema = z.object({ otp: z.string().min(4).max(8), action: z.enum(["deliver", "leave"]).default("deliver") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the pickup code" }, { status: 400 });
  const { id } = await params;
  const [delivery] = await db.select().from(deliveries).where(and(eq(deliveries.id, id), eq(deliveries.societyId, session.society!.id))).limit(1);
  if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  if (delivery.otp !== parsed.data.otp) return NextResponse.json({ error: "That code doesn't match this parcel." }, { status: 400 });
  const expected = parsed.data.action === "leave" ? "arrived" : "left_at_gate";
  const now = new Date();
  const [updated] = await db.update(deliveries).set({ status: parsed.data.action === "leave" ? "left_at_gate" : "delivered", deliveredAt: parsed.data.action === "leave" ? null : now })
    .where(and(eq(deliveries.id, id), eq(deliveries.status, expected), eq(deliveries.otp, parsed.data.otp))).returning({ id: deliveries.id });
  if (!updated) return NextResponse.json({ error: "This parcel is no longer available for this action." }, { status: 409 });
  if (delivery.unitId) {
    const hosts = await filterRecipientsByPref(session.society!.id, await residentsOfUnit(delivery.unitId, session.society!.id), "visitors");
    if (hosts.length) await db.insert(notifications).values(hosts.map((h) => ({ id: crypto.randomUUID(), userId: h.userId, societyId: session.society!.id, title: parsed.data.action === "leave" ? "Parcel kept at the gate" : "Parcel delivered", body: `${delivery.company} parcel ${parsed.data.action === "leave" ? "is safe at Gate 1. Collect with your code." : "was handed over."}`, type: "delivery" as const, link: "/app/deliveries", createdAt: now })));
  }
  revalidatePath("/gate"); revalidatePath("/app/deliveries"); revalidatePath("/admin/security");
  return NextResponse.json({ ok: true });
}
