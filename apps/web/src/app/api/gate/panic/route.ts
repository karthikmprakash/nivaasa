import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { panicAlerts } from "@/db/schema";
import { gateSession } from "@/lib/gate";

const schema = z.object({ id: z.string(), action: z.enum(["acknowledge", "resolve"]) });

export async function POST(req: Request) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await db.update(panicAlerts).set({ status: parsed.data.action === "resolve" ? "resolved" : "acknowledged", resolvedAt: parsed.data.action === "resolve" ? new Date() : null, resolvedBy: session.user.id }).where(and(eq(panicAlerts.id, parsed.data.id), eq(panicAlerts.societyId, session.society!.id)));
  revalidatePath("/gate"); revalidatePath("/admin/security"); revalidatePath("/app/emergency");
  return NextResponse.json({ ok: true });
}
