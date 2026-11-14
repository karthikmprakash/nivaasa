import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { cancelResidentBooking } from "@/lib/amenity-cancellation";

const schema = z.object({ bookingId: z.string().trim().min(1).max(100) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.unit || !session.society || !session.membership ||
      session.membership.role === "guard" || session.user.globalRole === "super_admin") {
    return NextResponse.json({ error: "Resident access required." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a booking to cancel." }, { status: 400 });
  const result = cancelResidentBooking({ ...session, unit: session.unit, society: session.society, membership: session.membership }, parsed.data.bookingId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
