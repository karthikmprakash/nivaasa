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

type Host = { societyId: string; unitId: string; userId: string; name: string };

export function saveVisitorPass(pass: Pass, host: Host) {
  return saveVisitorPasses([pass], host)[0];
}

export function saveVisitorPasses(passes: Pass[], host: Host) {
  return db.transaction((tx) => {
    const now = new Date();
    const saved = passes.map((pass) => {
      const id = crypto.randomUUID();
      const code = nextVisitorCode(tx, host.societyId);
      tx.insert(visitors).values({
        ...pass, id, societyId: host.societyId, unitId: host.unitId, hostUserId: host.userId,
        status: "approved", code, preApproved: true, approvedAt: now, approvedBy: host.userId, createdAt: now,
      }).run();
      tx.insert(auditLogs).values({
        id: crypto.randomUUID(), societyId: host.societyId, actorId: host.userId, actorName: host.name,
        action: "visitor.pass.created", entity: "visitor", entityId: id,
        metadata: { type: pass.type, recurringCab: pass.recurringCab, unitId: host.unitId }, createdAt: now,
      }).run();
      return { id, code, name: pass.name };
    });
    const guards = tx.select({ userId: memberships.userId }).from(memberships).where(and(
      eq(memberships.societyId, host.societyId), eq(memberships.status, "active"),
      inArray(memberships.role, ["guard", "security_manager"]),
    )).all();
    if (guards.length) tx.insert(notifications).values(guards.map(({ userId }) => ({
      id: crypto.randomUUID(), userId, societyId: host.societyId, title: passes.length === 1 ? "Pre-approved visitor added" : "Group guest passes created",
      body: passes.length === 1
        ? `${host.name} created a pass for ${passes[0].name} starting ${formatDate(passes[0].validFrom)}.`
        : `${host.name} created ${passes.length} guest passes starting ${formatDate(passes[0].validFrom)}.`,
      type: "visitor" as const, link: "/gate", createdAt: now,
    }))).run();
    return saved;
  }, { behavior: "immediate" });
}
