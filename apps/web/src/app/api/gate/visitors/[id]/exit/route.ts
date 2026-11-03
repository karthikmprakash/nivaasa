import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await gateSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.update(visitors).set({ status: "exited", exitedAt: new Date() }).where(and(eq(visitors.id, id), eq(visitors.societyId, session.society!.id)));
  revalidatePath("/gate"); revalidatePath("/admin/security");
  return NextResponse.json({ ok: true });
}
