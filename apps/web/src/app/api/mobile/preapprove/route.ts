import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { todayISO } from "@/lib/utils";
import { shiftPassDate, validatePassRequest } from "@/lib/visitor-pass-rules";
import { saveVisitorPass } from "@/lib/visitor-passes";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.unit || !session.society || session.membership?.role === "guard" || session.user.globalRole === "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object") return NextResponse.json({ error: "Enter the pass details." }, { status: 400 });
  const legacyDate = typeof data.date === "string" ? data.date : undefined;
  const legacyDays = Number.isInteger(data.days) && data.days >= 1 && data.days <= 30 ? data.days : 1;
  const result = validatePassRequest({
    ...data, validFrom: data.validFrom ?? legacyDate,
    validTo: data.validTo ?? (legacyDate ? shiftPassDate(legacyDate, legacyDays - 1) : undefined),
  }, todayISO());
  if (!result.pass) return NextResponse.json({ error: data.type === "domestic_help" ? "Register daily help in My home." : Object.values(result.fieldErrors)[0] ?? "Enter the pass details." }, { status: 400 });
  const saved = saveVisitorPass(result.pass, { societyId: session.society.id, unitId: session.unit.id, userId: session.user.id, name: session.user.name });
  return NextResponse.json({ ok: true, code: saved.code });
}
