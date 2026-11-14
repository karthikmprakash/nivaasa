import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30).regex(/^[+\d][\d\s-]{6,}$/) }),
  z.object({ action: z.literal("privacy"), visible: z.boolean() }),
  z.object({ action: z.literal("notifications"), visitors: z.boolean(), payments: z.boolean(), community: z.boolean(), helpdesk: z.boolean() }),
  z.object({ action: z.literal("password"), current: z.string().max(256), next: z.string().min(8).max(256), confirm: z.string().max(256) }),
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session?.membership || !session.unit || !session.society || !["owner", "tenant", "family", "committee"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Resident access required." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the required fields and try again." }, { status: 400 });
  const data = parsed.data;
  if (data.action === "profile") await db.update(users).set({ name: data.name, phone: data.phone }).where(eq(users.id, session.user.id));
  if (data.action === "privacy") await db.update(memberships).set({ directoryVisible: data.visible }).where(eq(memberships.id, session.membership.id));
  if (data.action === "notifications") await db.update(memberships).set({ notificationPrefs: { visitors: data.visitors, payments: data.payments, community: data.community, helpdesk: data.helpdesk } }).where(eq(memberships.id, session.membership.id));
  if (data.action === "password") {
    if (!verifyPassword(data.current, session.user.passwordHash)) return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
    if (data.next !== data.confirm) return NextResponse.json({ error: "The new passwords don't match." }, { status: 400 });
    await db.update(users).set({ passwordHash: hashPassword(data.next) }).where(eq(users.id, session.user.id));
  }
  for (const path of ["/app/settings", "/app", "/app/directory", "/app/my-home", "/admin/residents"]) revalidatePath(path);
  return NextResponse.json({ ok: true });
}
