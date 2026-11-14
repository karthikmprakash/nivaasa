import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { panicAlerts } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getSocietyContacts } from "@/lib/society-contacts";
import { resolveMyAlert } from "@/lib/actions/emergency";

export async function GET() {
  const session = await getSession();
  if (!session?.membership || !session.unit || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [alerts, contacts] = await Promise.all([
    db.select().from(panicAlerts).where(and(eq(panicAlerts.userId, session.user.id), eq(panicAlerts.societyId, session.society.id))).orderBy(desc(panicAlerts.createdAt)).limit(5),
    getSocietyContacts(session.society.id),
  ]);
  return NextResponse.json({ alerts, contacts, emergencyName: session.unit.emergencyName, emergencyContact: session.unit.emergencyContact });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.membership || !session.unit || !session.society || session.membership.role === "guard" || session.user.globalRole === "super_admin") return NextResponse.json({ error: "Resident access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an alert to resolve." }, { status: 400 });
  const [alert] = await db.select({ id: panicAlerts.id }).from(panicAlerts).where(and(eq(panicAlerts.id, parsed.data.id), eq(panicAlerts.userId, session.user.id), eq(panicAlerts.societyId, session.society.id))).limit(1);
  if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  const form = new FormData();
  form.set("id", alert.id);
  await resolveMyAlert(form);
  return NextResponse.json({ ok: true });
}
