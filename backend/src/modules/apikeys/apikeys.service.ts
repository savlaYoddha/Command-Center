import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../database/index.js";
import { apiKeys } from "../../database/schema/api-keys.js";
import { users } from "../../database/schema/users.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";

export const TASK_SCOPES = ["tasks:read", "tasks:write", "tasks:delete", "tasks:manage"] as const;
export type ApiScope = (typeof TASK_SCOPES)[number] | string;

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawKey(): string {
  return `cc_live_${randomBytes(24).toString("base64url")}`;
}

export async function listApiKeys(userId: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: JSON.parse(row.scopesJson) as string[],
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }));
}

export async function createApiKey(userId: string, name: string, scopes: string[]) {
  const raw = generateRawKey();
  const now = nowMs();
  const row = {
    id: createId(),
    userId,
    name: name.trim(),
    keyHash: hashApiKey(raw),
    keyPrefix: raw.slice(0, 12),
    scopesJson: JSON.stringify(scopes),
    lastUsedAt: null as number | null,
    createdAt: now,
    revokedAt: null as number | null,
  };
  await db.insert(apiKeys).values(row);
  return { ...row, key: raw, scopes };
}

export async function revokeApiKey(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
  if (!row) throw new HttpError(404, "NOT_FOUND", "API key not found.");
  await db.update(apiKeys).set({ revokedAt: nowMs() }).where(eq(apiKeys.id, id));
}

export async function regenerateApiKey(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
  if (!row) throw new HttpError(404, "NOT_FOUND", "API key not found.");
  const raw = generateRawKey();
  await db
    .update(apiKeys)
    .set({ keyHash: hashApiKey(raw), keyPrefix: raw.slice(0, 12) })
    .where(eq(apiKeys.id, id));
  return { id: row.id, name: row.name, key: raw, scopes: JSON.parse(row.scopesJson) as string[] };
}

export async function authenticateApiKey(raw: string) {
  if (!raw.startsWith("cc_live_")) return null;
  const hash = hashApiKey(raw);
  const [row] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)));
  if (!row) return null;
  const [user] = await db.select().from(users).where(eq(users.id, row.userId));
  if (!user) return null;
  await db.update(apiKeys).set({ lastUsedAt: nowMs() }).where(eq(apiKeys.id, row.id));
  return {
    userId: user.id,
    username: user.username,
    scopes: JSON.parse(row.scopesJson) as string[],
  };
}

export function scopeAllowed(granted: string[], needed: string): boolean {
  if (granted.includes("tasks:manage") && needed.startsWith("tasks:")) return true;
  return granted.includes(needed);
}
