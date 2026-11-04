import { randomInt } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, memberships, notifications, visitors } from "@/db/schema";
import { formatDate } from "@/lib/utils";
import type { validatePassRequest } from "@/lib/visitor-pass-rules";

type Pass = NonNullable<ReturnType<typeof validatePassRequest>["pass"]>;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function nextVisitorCode(tx: Transaction, societyId: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(randomInt(1_000_000)).padStart(6, "0");
    const existing = tx.select({ id: visitors.id }).from(visitors)
      .where(and(eq(visitors.societyId, societyId), eq(visitors.code, code), inArray(visitors.status, ["approved", "pending"]))).get();
    if (!existing) return code;
  }
  throw new Error("Could not allocate a visitor code.");
}

export function saveVisitorPass(pass: Pass, host: { societyId: string; unitId: string; userId: string; name: string }) {
  return db.transaction((tx) => {
    const id = crypto.randomUUID();
    const code = nextVisitorCode(tx, host.societyId);
    const now = new Date();
    tx.insert(visitors).values({
      ...pass, id, societyId: host.societyId, unitId: host.unitId, hostUserId: host.userId,
      status: "approved", code, preApproved: true, approvedAt: now, approvedBy: host.userId, createdAt: now,
    }).run();
    const guards = tx.select({ userId: memberships.userId }).from(memberships).where(and(
      eq(memberships.societyId, host.societyId), eq(memberships.status, "active"),
      inArray(memberships.role, ["guard", "security_manager"]),
    )).all();
    if (guards.length) tx.insert(notifications).values(guards.map(({ userId }) => ({
      id: crypto.randomUUID(), userId, societyId: host.societyId, title: "Pre-approved visitor added",
      body: `${host.name} created a pass for ${pass.name} starting ${formatDate(pass.validFrom)}.`,
      type: "visitor" as const, link: "/gate", createdAt: now,
    }))).run();
    tx.insert(auditLogs).values({
      id: crypto.randomUUID(), societyId: host.societyId, actorId: host.userId, actorName: host.name,
      action: "visitor.pass.created", entity: "visitor", entityId: id,
      metadata: { type: pass.type, recurringCab: pass.recurringCab, unitId: host.unitId }, createdAt: now,
    }).run();
    return { id, code };
  }, { behavior: "immediate" });
}
