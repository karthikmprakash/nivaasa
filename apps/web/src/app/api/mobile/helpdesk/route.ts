import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { helpdeskTickets, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.membership?.unitId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ ticket: helpdeskTickets, assignee: users.name }).from(helpdeskTickets).leftJoin(users, eq(helpdeskTickets.assigneeId, users.id)).where(eq(helpdeskTickets.unitId, session.membership.unitId)).orderBy(desc(helpdeskTickets.createdAt));
  return NextResponse.json({ tickets: rows.map((r) => ({ ...r.ticket, assignee: r.assignee })) });
}

const schema = z.object({ category: z.string(), scope: z.enum(["personal", "community"]), subject: z.string().min(5), description: z.string().min(10), priority: z.enum(["low", "medium", "high", "urgent"]).default("medium") });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership?.unitId || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete the request details." }, { status: 400 });
  const now = new Date();
  const hours = parsed.data.priority === "urgent" ? 4 : parsed.data.priority === "high" ? 8 : parsed.data.priority === "medium" ? 24 : 48;
  const id = crypto.randomUUID();
  await db.insert(helpdeskTickets).values({ id, societyId: session.society.id, unitId: session.membership.unitId, raisedBy: session.user.id, category: parsed.data.category, scope: parsed.data.scope, subject: parsed.data.subject, description: parsed.data.description, priority: parsed.data.priority, status: "open", slaDueAt: new Date(now.getTime() + hours * 3600 * 1000), createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, id });
}
