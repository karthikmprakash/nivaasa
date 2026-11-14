import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { addDailyHelp } from "@/lib/actions/household";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["House help", "Cook", "Driver", "Nanny", "Gardener", "Other"]),
  phone: z.string().trim().min(7).max(30),
  shift: z.string().trim().max(80).optional(),
  monthlyRate: z.number().min(0).max(10_000_000).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.membership?.unitId || !session.unit || !session.society || !["owner", "tenant", "family", "committee"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Resident access required." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter their name, role and phone number." }, { status: 400 });

  const form = new FormData();
  form.set("name", parsed.data.name);
  form.set("role", parsed.data.role);
  form.set("phone", parsed.data.phone);
  form.set("shift", parsed.data.shift ?? "");
  if (parsed.data.monthlyRate !== undefined) form.set("monthlyRate", String(parsed.data.monthlyRate));
  const result = await addDailyHelp({}, form);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.message ?? "Daily help registered." }, { status: 201 });
}
