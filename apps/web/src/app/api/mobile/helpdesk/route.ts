import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { helpdeskTickets, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { saveTicketPhoto } from "@/lib/ticket-attachments";

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
  // Accept JSON or multipart/form-data (with an optional photo attachment).
  let raw: unknown;
  let photo: File | null = null;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData();
    const value = form.get("photo");
    photo = typeof File !== "undefined" && value instanceof File ? value : null;
    raw = Object.fromEntries([...form.entries()].filter(([key, entry]) => key !== "photo" && typeof entry === "string"));
  } else {
    raw = await req.json().catch(() => null);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please complete the request details." }, { status: 400 });
  const now = new Date();
  const hours = parsed.data.priority === "urgent" ? 4 : parsed.data.priority === "high" ? 8 : parsed.data.priority === "medium" ? 24 : 48;
  const id = crypto.randomUUID();
  const attachments: string[] = [];
  if (photo) {
    try {
      attachments.push(await saveTicketPhoto(id, photo));
    } catch (photoError) {
      console.error("Ticket photo upload failed", { id, message: photoError instanceof Error ? photoError.message : "unknown" });
    }
  }
  await db.insert(helpdeskTickets).values({ id, societyId: session.society.id, unitId: session.membership.unitId, raisedBy: session.user.id, category: parsed.data.category, scope: parsed.data.scope, subject: parsed.data.subject, description: parsed.data.description, attachments, priority: parsed.data.priority, status: "open", slaDueAt: new Date(now.getTime() + hours * 3600 * 1000), createdAt: now, updatedAt: now });
  return NextResponse.json({ ok: true, id });
}
