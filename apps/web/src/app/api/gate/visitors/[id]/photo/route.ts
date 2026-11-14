import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";
import { saveVisitorPhoto } from "@/lib/visitor-photo";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await gateSession({ allowManager: true });
  if (!session?.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [visitor] = await db.select({ id: visitors.id }).from(visitors).where(and(eq(visitors.id, id), eq(visitors.societyId, session.society.id))).limit(1);
  if (!visitor) return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a visitor photo." }, { status: 400 });
  try {
    const photoFile = await saveVisitorPhoto(visitor.id, file);
    await db.update(visitors).set({ photoUrl: photoFile }).where(and(eq(visitors.id, visitor.id), eq(visitors.societyId, session.society.id)));
    return NextResponse.json({ ok: true, photoUrl: `/api/visitors/${visitor.id}/photo` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save the photo." }, { status: 400 });
  }
}
