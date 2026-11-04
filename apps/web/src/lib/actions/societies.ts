"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { switchSocietyForSession } from "@/lib/society-switch";

/** Switch the active society from a menu without a full page form post. */
export async function switchSocietyAction(slug: string, next?: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  const destination = await switchSocietyForSession(session, slug, next);
  redirect(destination);
}
