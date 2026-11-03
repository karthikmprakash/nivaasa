import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { societies } from "@/db/schema";
import { getSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const [society] = await db.select().from(societies).where(eq(societies.slug, slug)).limit(1);
  if (!society) return NextResponse.redirect(new URL("/portfolio", req.url));
  const membership = session.memberships.find((m) => m.societyId === society.id);
  if (!membership) return NextResponse.redirect(new URL("/portfolio", req.url));
  const res = NextResponse.redirect(new URL(session.user.globalRole === "super_admin" ? "/admin" : membership.role === "guard" ? "/gate" : "/admin", req.url));
  res.cookies.set("nivaasa_society", society.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
