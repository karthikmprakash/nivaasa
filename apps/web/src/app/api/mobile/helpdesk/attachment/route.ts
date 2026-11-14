import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { helpdeskTickets } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { readTicketPhoto } from "@/lib/ticket-attachments";

// Serves a ticket photo to the owning resident or same-society staff.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.membership || !session.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("ticket") ?? "";
  const name = url.searchParams.get("name") ?? "";
  if (!ticketId || !name || name.includes("/") || name.includes("..")) return NextResponse.json({ error: "Invalid attachment." }, { status: 400 });
  const [ticket] = await db.select({ unitId: helpdeskTickets.unitId, societyId: helpdeskTickets.societyId, attachments: helpdeskTickets.attachments })
    .from(helpdeskTickets).where(eq(helpdeskTickets.id, ticketId)).limit(1);
  if (!ticket) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const owns = ticket.unitId === session.membership.unitId && ticket.societyId === session.membership.societyId;
  const staff = ticket.societyId === session.society.id && ["admin", "manager", "helpdesk_manager", "security_manager", "guard", "accountant", "committee", "auditor"].includes(session.membership.role ?? "");
  if (!owns && !staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ticket.attachments?.includes(name)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const photo = await readTicketPhoto(name);
  if (!photo) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(photo.bytes, {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
