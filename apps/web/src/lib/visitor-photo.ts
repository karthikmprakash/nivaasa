import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const VISITOR_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export function visitorUploadDir() {
  return process.env.NIVAASA_UPLOADS_DIR
    ? path.resolve(process.env.NIVAASA_UPLOADS_DIR, "visitors")
    : path.resolve(process.cwd(), "../../data/uploads/visitors");
}

export function validVisitorPhoto(file: File) {
  return VISITOR_IMAGE_TYPES[file.type] !== undefined && file.size > 0 && file.size <= 6 * 1024 * 1024;
}

export async function saveVisitorPhoto(visitorId: string, file: File) {
  if (!validVisitorPhoto(file)) throw new Error("Use a JPG, PNG, WebP or HEIC photo up to 6 MB.");
  const dir = visitorUploadDir();
  await fs.mkdir(dir, { recursive: true });
  const extension = VISITOR_IMAGE_TYPES[file.type];
  const name = `${visitorId}-${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readVisitorPhoto(photoUrl: string) {
  const name = path.basename(photoUrl.split("?")[0]);
  const extension = path.extname(name).toLowerCase();
  const mime = Object.entries(VISITOR_IMAGE_TYPES).find(([, ext]) => `.${ext}` === extension)?.[0];
  if (!mime) return null;
  try {
    return { bytes: await fs.readFile(path.join(visitorUploadDir(), name)), mime };
  } catch {
    return null;
  }
}

export function signedVisitorPhotoUrl(visitorId: string, origin: string, seconds = 900) {
  const secret = process.env.PUSH_IMAGE_SECRET;
  if (!secret) return null;
  const expires = Math.floor(Date.now() / 1000) + seconds;
  const signature = createHmac("sha256", secret).update(`${visitorId}:${expires}`).digest("hex");
  return new URL(`/api/visitors/${visitorId}/photo?expires=${expires}&signature=${signature}`, origin).toString();
}

export function validVisitorPhotoSignature(visitorId: string, expires: string | null, signature: string | null) {
  const secret = process.env.PUSH_IMAGE_SECRET;
  const expiry = Number(expires);
  if (!secret || !Number.isFinite(expiry) || expiry < Date.now() / 1000 || expiry > Date.now() / 1000 + 3600 || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${visitorId}:${expiry}`).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
