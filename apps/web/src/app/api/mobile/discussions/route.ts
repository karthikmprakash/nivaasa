import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, discussions } from "@/db/schema";
import { getSession } from "@/lib/auth";

const schema = z.object({
  title: z.string().trim().min(6).max(200),
  body: z.string().trim().min(10).max(10000),
  category: z.enum(["general", "suggestion", "question", "lost_found", "safety"]),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.membership || !session.unit || !session.society || !["owner", "tenant", "family", "committee"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Only residents can start discussions." }, { status: 403 });
  }
  const result = schema.safeParse(await request.json().catch(() => null));
  if (!result.success) return NextResponse.json({ error: "Add a clear title, category and post." }, { status: 400 });
  const id = crypto.randomUUID();
  const now = new Date();
  const needsApproval = session.society.settings?.discussionApproval ?? true;
  db.transaction(tx => {
    tx.insert(discussions).values({ id, ...result.data, societyId: session.society!.id, authorId: session.user.id,
      status: needsApproval ? "pending" : "published", createdAt: now }).run();
    tx.insert(auditLogs).values({ id: crypto.randomUUID(), societyId: session.society!.id, actorId: session.user.id,
      actorName: session.user.name, action: "discussion.created", entity: "discussion", entityId: id,
      metadata: { title: result.data.title, category: result.data.category, moderation: needsApproval }, createdAt: now }).run();
  });
  revalidatePath("/app/community");
  revalidatePath("/admin/communications");
  return NextResponse.json({ ok: true, id, status: needsApproval ? "pending" : "published" }, { status: 201 });
}
