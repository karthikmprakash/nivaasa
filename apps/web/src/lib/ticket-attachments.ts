import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export function ticketUploadDir() {
  return process.env.NIVAASA_UPLOADS_DIR
    ? path.resolve(process.env.NIVAASA_UPLOADS_DIR, "helpdesk")
    : path.resolve(process.cwd(), "../../data/uploads/helpdesk");
}

export async function saveTicketPhoto(ticketId: string, file: File) {
  if (!IMAGE_TYPES[file.type] || file.size === 0 || file.size > 6 * 1024 * 1024) {
    throw new Error("Use a JPG, PNG, WebP or HEIC photo up to 6 MB.");
  }
  const dir = ticketUploadDir();
  await fs.mkdir(dir, { recursive: true });
  const name = `${ticketId}-${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readTicketPhoto(name: string) {
  const base = path.basename(name);
  const ext = path.extname(base).toLowerCase();
  const mime = Object.entries(IMAGE_TYPES).find(([, e]) => `.${e}` === ext)?.[0];
  if (!mime) return null;
  try {
    return { bytes: await fs.readFile(path.join(ticketUploadDir(), base)), mime };
  } catch {
    return null;
  }
}
