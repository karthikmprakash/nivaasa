import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { units } from "@/db/schema";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let unit = null;
  if (session.unit) unit = { id: session.unit.id, number: session.unit.number, type: session.unit.unitType, areaSqft: session.unit.areaSqft };
  const role = session.membership?.role;
  const home = session.user.globalRole === "super_admin" ? "/portfolio" : role === "guard" ? "/gate" : ["admin", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor", "committee"].includes(role ?? "") ? "/admin" : "/app";
  return NextResponse.json({
    home,
    user: { id: session.user.id, name: session.user.name, email: session.user.email, phone: session.user.phone, avatarColor: session.user.avatarColor, globalRole: session.user.globalRole },
    membership: session.membership ? { role: session.membership.role, unitId: session.membership.unitId, societyId: session.membership.societyId, designation: session.membership.designation } : null,
    society: session.society ? { id: session.society.id, name: session.society.name, city: session.society.city, slug: session.society.slug } : null,
    unit,
  });
}
