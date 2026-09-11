import { and, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { savedFilters } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function listSavedFilters(userId: string) {
  return db.select().from(savedFilters).where(eq(savedFilters.userId, userId)).orderBy(savedFilters.createdAt);
}

export async function createSavedFilter(userId: string, name: string, payload: unknown) {
  const trimmed = name.trim();
  if (!trimmed) throw new HttpError(400, "INVALID_NAME", "Filter name is required.");
  const now = nowMs();
  const row = {
    id: createId(),
    userId,
    name: trimmed,
    payloadJson: JSON.stringify(payload ?? {}),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(savedFilters).values(row);
  return row;
}

export async function updateSavedFilter(
  userId: string,
  filterId: string,
  patch: { name?: string; payload?: unknown },
) {
  const [row] = await db
    .select()
    .from(savedFilters)
    .where(and(eq(savedFilters.id, filterId), eq(savedFilters.userId, userId)));
  if (!row) throw new HttpError(404, "NOT_FOUND", "Saved filter not found.");
  const next = {
    name: patch.name?.trim() || row.name,
    payloadJson: patch.payload === undefined ? row.payloadJson : JSON.stringify(patch.payload),
    updatedAt: nowMs(),
  };
  await db.update(savedFilters).set(next).where(eq(savedFilters.id, filterId));
  return { ...row, ...next };
}

export async function deleteSavedFilter(userId: string, filterId: string) {
  const [row] = await db
    .select()
    .from(savedFilters)
    .where(and(eq(savedFilters.id, filterId), eq(savedFilters.userId, userId)));
  if (!row) throw new HttpError(404, "NOT_FOUND", "Saved filter not found.");
  await db.delete(savedFilters).where(eq(savedFilters.id, filterId));
}
