import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { helpdeskTickets, ticketComments, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import type { ResidentContext } from "@/lib/queries";
import { changeResidentTicket } from "@/lib/resident-ticket";

type Route = { params: Promise<{ id: string }> };

async function resident(): Promise<ResidentContext | null> {
  const session = await getSession();
  if (!session?.unit || !session.society || !session.membership ||
      session.membership.role === "guard" || session.user.globalRole === "super_admin") return null;
  return session as ResidentContext;
}

export async function GET(_request: Request, { params }: Route) {
  const ctx = await resident();
  if (!ctx) return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  const { id } = await params;
  const [record] = await db.select({ ticket: helpdeskTickets, assignee: users.name })
    .from(helpdeskTickets).leftJoin(users, eq(helpdeskTickets.assigneeId, users.id))
    .where(and(eq(helpdeskTickets.id, id), eq(helpdeskTickets.unitId, ctx.unit.id), eq(helpdeskTickets.societyId, ctx.society.id)))
    .limit(1);
  if (!record) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const comments = await db.select({
    id: ticketComments.id, body: ticketComments.body, createdAt: ticketComments.createdAt, author: users.name,
  }).from(ticketComments).innerJoin(users, eq(ticketComments.authorId, users.id))
    .where(and(eq(ticketComments.ticketId, id), eq(ticketComments.internal, false)))
    .orderBy(asc(ticketComments.createdAt), asc(ticketComments.id));
  return NextResponse.json({ ticket: { ...record.ticket, assignee: record.assignee }, comments });
}

export async function POST(request: Request, { params }: Route) {
  const ctx = await resident();
  if (!ctx) return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  const { id } = await params;
  const result = await changeResidentTicket(ctx, id, await request.json().catch(() => null));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
