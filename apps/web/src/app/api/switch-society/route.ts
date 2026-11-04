import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { switchSocietyForSession } from "@/lib/society-switch";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const next = String(form.get("next") ?? "");
  const destination = await switchSocietyForSession(session, slug, next);
  return NextResponse.redirect(new URL(destination, req.url));
}
