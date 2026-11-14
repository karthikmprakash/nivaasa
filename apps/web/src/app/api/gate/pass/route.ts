import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { units, visitors } from "@/db/schema";
import { gateSession } from "@/lib/gate";
import { todayISO } from "@/lib/utils";

const schema = z.object({ code: z.string().regex(/^\d{6}$/), passId: z.string().min(1).max(100).optional() });

export async function POST(request: Request) {
  const session = await gateSession({ allowManager: true });
  if (!session?.society) return NextResponse.json({ error: "Gate access required." }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a six-digit visitor code." }, { status: 400 });
  const { code, passId } = input.data;
  const matches = db.select({ pass: visitors, unit: units.number }).from(visitors)
    .innerJoin(units, eq(visitors.unitId, units.id)).where(and(
      eq(visitors.societyId, session.society.id), eq(visitors.code, code), eq(visitors.preApproved, true),
      passId ? eq(visitors.id, passId) : inArray(visitors.status, ["approved", "exited"]),
    )).limit(3).all();
  if (!matches.length) return NextResponse.json({ error: "No active pass matches this code in this community." }, { status: 404 });

  const now = new Date();
  const today = todayISO();
  const passes = [];
  let error = "This pass has already been used or was cancelled.";
  for (const { pass, unit } of matches) {
    // A pass inside its validity window can be re-verified after an exit, so
    // personal invites allow multiple entries within the window.
    if (pass.status !== "approved" && pass.status !== "exited") continue;
    if (pass.validFrom && pass.validFrom > now) { error = "This pass is not valid yet."; continue; }
    if (pass.validTo && pass.validTo < now) { error = "This pass has expired."; continue; }
    if (pass.recurringCab && db.select({ id: visitors.id }).from(visitors)
      .where(and(eq(visitors.sourcePassId, pass.id), eq(visitors.entryDay, today))).get()) {
      error = "This daily cab pass has already been used today.";
      continue;
    }
    passes.push({
      id: pass.id, unitId: pass.unitId, name: pass.name, type: pass.type, unit,
      notes: pass.notes, leaveAtGate: pass.leaveAtGate,
    });
  }
  return passes.length ? NextResponse.json({ passes }) : NextResponse.json({ error }, { status: 409 });
}
