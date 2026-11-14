import { randomInt } from "node:crypto";
import { NextResponse, after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs, deliveries, notifications, units, visitors } from "@/db/schema";
import { gateSession, residentsOfUnit } from "@/lib/gate";
import { filterRecipientsByPref } from "@/lib/notifications";
import { todayISO } from "@/lib/utils";
import { validVisitorPhone } from "@/lib/visitor-pass-rules";
import { nextVisitorCode } from "@/lib/visitor-passes";
import { saveVisitorPhoto } from "@/lib/visitor-photo";
import { sendVisitorGatePush } from "@/lib/push/apns";

const schema = z.object({
  type: z.enum(["guest", "delivery", "cab", "domestic_help", "vendor", "other"]),
  unitId: z.string(),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(100).optional(),
  purpose: z.string().max(160).optional(),
  vehicleNo: z.string().trim().max(30).optional(),
  code: z.string().regex(/^\d{6}$/).optional(),
  notes: z.string().max(300).optional(),
  passId: z.string().min(1).max(100).optional(),
}).refine((entry) => !entry.passId || !!entry.code);

export async function POST(req: Request) {
  const session = await gateSession({ allowManager: true });
  if (!session?.society) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentType = req.headers.get("content-type") ?? "";
  let raw: unknown;
  let photo: File | null = null;
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const value = form.get("photo");
    photo = typeof File !== "undefined" && value instanceof File ? value : null;
    raw = Object.fromEntries([...form.entries()].filter(([key, entry]) => key !== "photo" && typeof entry === "string"));
  } else {
    raw = await req.json().catch(() => null);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Enter valid visitor details." }, { status: 400 });
  const d = parsed.data;
  if (photo && photo.size > 6 * 1024 * 1024) return NextResponse.json({ error: "Use a visitor photo up to 6 MB." }, { status: 400 });
  if (session.membership?.role === "manager" && session.user.globalRole !== "super_admin" && !d.passId) {
    return NextResponse.json({ error: "Verify a pre-approved visitor pass first." }, { status: 403 });
  }
  const societyId = session.society.id;
  const guardId = session.user.id;
  const [unit] = await db.select().from(units).where(and(eq(units.id, d.unitId), eq(units.societyId, societyId))).limit(1);
  if (!unit) return NextResponse.json({ error: "Choose a valid home." }, { status: 404 });
  const hosts = await residentsOfUnit(unit.id, societyId);
  const notifyHosts = await filterRecipientsByPref(societyId, hosts, "visitors");
  const now = new Date();
  const day = todayISO();
  const fail = (error: string, status = 400) => ({ error, status } as const);

  const result = db.transaction((tx) => {
    const pass = d.code ? tx.select().from(visitors).where(and(
      eq(visitors.societyId, societyId), eq(visitors.unitId, unit.id), eq(visitors.code, d.code),
      eq(visitors.preApproved, true), inArray(visitors.status, ["approved", "exited"]),
      d.passId ? eq(visitors.id, d.passId) : undefined,
    )).get() : undefined;
    if (d.code && !pass) return fail("That passcode is invalid or no longer active.", 404);
    if (pass?.validFrom && pass.validFrom > now) return fail("This pass is not valid yet.", 409);
    if (pass?.validTo && pass.validTo < now) return fail("This pass has expired.", 409);

    const type = pass?.type ?? d.type;
    if (type === "domestic_help" && !pass) return fail("Use the daily help attendance panel to check in registered workers.");
    const useGuestDetails = pass?.type === "guest";
    const name = useGuestDetails ? pass.name : d.name;
    const phone = useGuestDetails ? pass.phone : d.phone;
    if (!name) return fail("Enter the visitor’s name.");
    if (!useGuestDetails && (!phone || !validVisitorPhone(phone))) return fail("Enter a valid visitor phone number.");
    const vehicleNo = type === "cab" ? d.vehicleNo?.toUpperCase() : null;
    if (type === "cab" && !vehicleNo) return fail("Enter the cab registration number.");

    const visitorId = pass && !pass.recurringCab ? pass.id : crypto.randomUUID();
    const company = pass?.company ?? d.company ?? null;
    const leaveAtGate = type === "delivery" && !!pass?.leaveAtGate;
    const autoApprove = !pass && type !== "delivery" && session.society!.settings?.visitorApproval === false;
    const status = leaveAtGate ? "left_at_gate" : pass || autoApprove ? "entered" : "pending";
    const log = {
      name, phone: phone || null, vehicleNo: vehicleNo || null, guardId,
      enteredAt: status === "entered" ? now : null,
      exitedAt: leaveAtGate ? now : null,
    };

    const walkInCode = pass ? null : nextVisitorCode(tx, societyId);
    if (pass?.recurringCab) {
      const occurrence = tx.insert(visitors).values({
        ...log, id: visitorId, societyId, unitId: unit.id, hostUserId: pass.hostUserId,
        type, company, purpose: pass.purpose, notes: pass.notes, status: "entered",
        sourcePassId: pass.id, entryDay: day, approvedAt: pass.approvedAt, approvedBy: pass.approvedBy, createdAt: now,
      }).onConflictDoNothing({ target: [visitors.sourcePassId, visitors.entryDay] }).returning({ id: visitors.id }).get();
      if (!occurrence) return fail("This daily cab pass has already been used today.", 409);
    } else if (pass) {
      tx.update(visitors).set({ ...log, status: leaveAtGate ? "exited" : "entered" }).where(eq(visitors.id, pass.id)).run();
    } else {
      tx.insert(visitors).values({
        ...log, id: visitorId, societyId, unitId: unit.id, hostUserId: hosts[0]?.userId ?? null,
        type, company, purpose: d.purpose || null, notes: d.notes || null,
        status: autoApprove ? "entered" : "pending", code: walkInCode, createdAt: now,
        enteredAt: autoApprove ? now : null,
        approvedAt: autoApprove ? now : null,
        approvedBy: autoApprove ? guardId : null,
      }).run();
    }

    if (type === "delivery" && (!pass || leaveAtGate)) {
      tx.insert(deliveries).values({
        id: crypto.randomUUID(), societyId, unitId: unit.id, hostUserId: pass?.hostUserId ?? hosts[0]?.userId ?? null, guardId,
        company: company || "Delivery", courierName: name,
        status: leaveAtGate ? "left_at_gate" : "arrived",
        otp: leaveAtGate ? String(randomInt(1_000_000)).padStart(6, "0") : walkInCode,
        notes: pass?.notes ?? d.notes ?? null, createdAt: now,
      }).run();
    }

    if (notifyHosts.length) tx.insert(notifications).values(notifyHosts.map((h) => ({
      id: crypto.randomUUID(), userId: h.userId, societyId,
      title: leaveAtGate ? "Parcel ready for pickup" : pass || autoApprove ? `${name} entered the community` : "Visitor waiting at the gate",
      body: leaveAtGate ? "Find your pickup code in Deliveries." : pass ? "Verified with their passcode at the gate." : autoApprove ? "Auto-approved at the gate by your society's visitor policy." : `${name} is at the gate for Home ${unit.number}. Approve or deny in the app.`,
      type: "security" as const, link: leaveAtGate ? "/app/deliveries" : "/app/visitors", createdAt: now,
    }))).run();
    tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId, actorId: guardId, actorName: session.user.name,
      action: leaveAtGate ? "visitor.delivery.left_at_gate" : pass ? "visitor.entered" : "visitor.requested",
      entity: "visitor", entityId: visitorId, metadata: { name, type, unit: unit.number, passId: pass?.id }, createdAt: now,
    }).run();
    return { ok: true, status, name, unit: unit.number, visitorId };
  }, { behavior: "immediate" });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const visitorId = result.visitorId;
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const gatePhone = session.user.phone || null;
  after(async () => {
    if (photo) {
      try {
        const photoFile = await saveVisitorPhoto(visitorId, photo);
        await db.update(visitors).set({ photoUrl: photoFile }).where(and(eq(visitors.id, visitorId), eq(visitors.societyId, societyId)));
      } catch (photoError) {
        console.error("Visitor photo upload failed", { visitorId, message: photoError instanceof Error ? photoError.message : "unknown" });
      }
    }
    if (result.status === "pending" && notifyHosts.length) {
      const [latest] = await db.select().from(visitors).where(and(eq(visitors.id, visitorId), eq(visitors.societyId, societyId))).limit(1);
      if (latest) {
        await sendVisitorGatePush({
          visitor: latest,
          unitNumber: unit.number,
          hostUserIds: notifyHosts.map(host => host.userId),
          origin,
          gatePhone,
        });
      }
    }
  });
  for (const path of ["/gate", "/app", "/app/visitors", "/app/deliveries", "/admin/security"]) revalidatePath(path);
  return NextResponse.json(result);
}
