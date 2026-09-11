import { and, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { labels, taskLabels } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { ensureBoard } from "./columns.service.js";

export async function listLabels(userId: string) {
  await ensureBoard(userId);
  return db.select().from(labels).where(eq(labels.userId, userId)).orderBy(labels.name);
}

export async function createLabel(userId: string, name: string, color: string) {
  await ensureBoard(userId);
  const trimmed = name.trim();
  if (!trimmed) throw new HttpError(400, "INVALID_NAME", "Label name is required.");
  const label = {
    id: createId(),
    userId,
    name: trimmed,
    color,
    createdAt: nowMs(),
  };
  try {
    await db.insert(labels).values(label);
  } catch {
    throw new HttpError(409, "DUPLICATE_LABEL", "A label with that name already exists.");
  }
  await recordActivity({
    userId,
    module: "tasks",
    action: "LABEL_CREATED",
    entityType: "label",
    entityId: label.id,
    summary: `Label created: ${label.name}`,
  });
  return label;
}

export async function updateLabel(userId: string, labelId: string, patch: { name?: string; color?: string }) {
  const [label] = await db
    .select()
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new HttpError(404, "NOT_FOUND", "Label not found.");
  const next = {
    name: patch.name?.trim() || label.name,
    color: patch.color ?? label.color,
  };
  await db.update(labels).set(next).where(eq(labels.id, labelId));
  return { ...label, ...next };
}

export async function deleteLabel(userId: string, labelId: string) {
  const [label] = await db
    .select()
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new HttpError(404, "NOT_FOUND", "Label not found.");
  await db.delete(taskLabels).where(eq(taskLabels.labelId, labelId));
  await db.delete(labels).where(eq(labels.id, labelId));
  await recordActivity({
    userId,
    module: "tasks",
    action: "LABEL_DELETED",
    entityType: "label",
    entityId: labelId,
    summary: `Label deleted: ${label.name}`,
  });
}

export async function assertLabelOwner(userId: string, labelId: string) {
  const [label] = await db
    .select()
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)));
  if (!label) throw new HttpError(404, "NOT_FOUND", "Label not found.");
  return label;
}
