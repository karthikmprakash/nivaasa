import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate } from "@/lib/login";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const result = await authenticate(parsed.data.email, parsed.data.password);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({
    token: result.token,
    expiresAt: result.expiresAt,
    home: result.home,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, phone: result.user.phone, avatarColor: result.user.avatarColor, globalRole: result.user.globalRole },
    membership: result.membership ? { role: result.membership.role, unitId: result.membership.unitId, societyId: result.membership.societyId, designation: result.membership.designation } : null,
  });
}
