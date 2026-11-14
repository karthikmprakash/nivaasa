import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { readVisitorPhoto, validVisitorPhotoSignature } from "@/lib/visitor-photo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const [visitor] = await db.select({ unitId: visitors.unitId, societyId: visitors.societyId, photoUrl: visitors.photoUrl }).from(visitors).where(eq(visitors.id, id)).limit(1);
  if (!visitor?.photoUrl) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const signed = validVisitorPhotoSignature(id, url.searchParams.get("expires"), url.searchParams.get("signature"));
  if (!signed) {
    const session = await getSession();
    const sameHome = session?.membership?.unitId && session.membership.unitId === visitor.unitId;
    const security = session?.membership?.societyId === visitor.societyId && ["admin", "manager", "security_manager", "guard"].includes(session?.membership?.role ?? "");
    if (!session || (!sameHome && !security)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photo = await readVisitorPhoto(visitor.photoUrl);
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  return new NextResponse(photo.bytes, {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": signed ? "private, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
