import "server-only";
import http2 from "node:http2";
import { createPrivateKey, sign } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pushDevices, type Visitor } from "@/db/schema";
import { signedVisitorPhotoUrl } from "@/lib/visitor-photo";

export const VISITOR_GATE_CATEGORY = "VISITOR_AT_GATE";

const hostByEnvironment = {
  sandbox: "https://api.sandbox.push.apple.com",
  production: "https://api.push.apple.com",
} as const;

let tokenCache: { token: string; createdAt: number } | null = null;

export function apnsConfigured() {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY);
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function providerToken() {
  if (tokenCache && Date.now() - tokenCache.createdAt < 50 * 60 * 1000) return tokenCache.token;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !privateKey) throw new Error("APNs is not configured.");
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: createPrivateKey(privateKey), dsaEncoding: "ieee-p1363" });
  const token = `${unsigned}.${base64url(signature)}`;
  tokenCache = { token, createdAt: Date.now() };
  return token;
}

function pushBody(visitor: Visitor, unitNumber: string, origin: string, gatePhone?: string | null) {
  const company = visitor.company?.trim();
  const type = visitor.type.replace("_", " ");
  const purpose = visitor.purpose?.trim();
  const title = `${visitor.name} is at the gate`;
  const subtitle = `${company ? `${company} · ` : ""}Home ${unitNumber}`;
  const body = [purpose || (type === "delivery" ? "Delivery for your home" : `${type[0]?.toUpperCase() ?? ""}${type.slice(1)} visitor`), visitor.notes]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 220);
  const imageUrl = signedVisitorPhotoUrl(visitor.id, origin);
  const callPhone = visitor.phone || gatePhone || null;
  return {
    aps: {
      alert: { title, subtitle, body },
      sound: "default",
      category: VISITOR_GATE_CATEGORY,
      "thread-id": `visitor-${visitor.id}`,
      "mutable-content": 1,
      "relevance-score": 1,
    },
    visitorId: visitor.id,
    visitorName: visitor.name,
    photoColor: visitor.photoColor ?? "#3155d8",
    unitNumber,
    visitorType: visitor.type,
    company: company ?? "",
    purpose: purpose ?? "",
    imageUrl: imageUrl ?? "",
    callPhone: callPhone ?? "",
  };
}

async function deliver(host: string, deviceToken: string, environment: "sandbox" | "production", payload: object) {
  return await new Promise<{ status: number; reason?: string }>((resolve, reject) => {
    const client = http2.connect(hostByEnvironment[environment]);
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("APNs request timed out."));
    }, 12_000);
    client.once("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken()}`,
      "apns-topic": process.env.APNS_BUNDLE_ID ?? "app.nivaasa.community",
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 15 * 60),
      "content-type": "application/json",
    });
    let data = "";
    let status = 0;
    request.on("response", headers => { status = Number(headers[":status"] ?? 0); });
    request.on("data", chunk => { if (data.length < 4096) data += chunk.toString(); });
    request.on("end", () => {
      clearTimeout(timeout);
      client.close();
      let reason: string | undefined;
      try { reason = JSON.parse(data)?.reason; } catch {}
      resolve({ status, reason });
    });
    request.on("error", error => {
      clearTimeout(timeout);
      client.destroy();
      reject(error);
    });
    request.end(JSON.stringify(payload));
  });
}

/** Runs after the gate response; a push failure never fails or delays an entry. */
export async function sendVisitorGatePush(input: {
  visitor: Visitor;
  unitNumber: string;
  hostUserIds: string[];
  origin: string;
  gatePhone?: string | null;
}) {
  if (!apnsConfigured() || !input.hostUserIds.length) return { sent: 0, skipped: true };
  const devices = await db.select().from(pushDevices).where(and(
    eq(pushDevices.societyId, input.visitor.societyId),
    inArray(pushDevices.userId, [...new Set(input.hostUserIds)]),
    eq(pushDevices.platform, "ios"),
    isNull(pushDevices.revokedAt),
  ));
  const unique = new Map(devices.map(device => [device.token, device]));
  if (!unique.size) return { sent: 0, skipped: true };
  const payload = pushBody(input.visitor, input.unitNumber, input.origin, input.gatePhone);
  let sent = 0;
  for (const device of unique.values()) {
    try {
      const result = await deliver(hostByEnvironment[device.environment], device.token, device.environment, payload);
      const stale = ["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"].includes(result.reason ?? "");
      if (result.status === 200) sent += 1;
      if (result.status === 410 || stale) {
        await db.update(pushDevices).set({ revokedAt: new Date(), updatedAt: new Date() }).where(eq(pushDevices.id, device.id));
      } else if (result.status !== 200) {
        console.error("APNs delivery failed", { deviceId: device.id, status: result.status, reason: result.reason });
      }
    } catch (error) {
      console.error("APNs delivery failed", { deviceId: device.id, message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return { sent, skipped: false };
}
