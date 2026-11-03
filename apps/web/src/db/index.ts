import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const databasePath = process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "../../data/nivaasa.db");
const dir = path.dirname(databasePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

const sqlite = globalForDb.sqlite ?? new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };
