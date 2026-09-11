import { and, eq, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import { checklistItems } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { getTask } from "./tasks.service.js";

export async function listChecklist(userId: string, taskId: string) {
  await getTask(userId, taskId);
  return db.select().from(checklistItems).where(eq(checklistItems.taskId, taskId)).orderBy(checklistItems.position);
}

export async function addChecklistItem(userId: string, taskId: string, text: string) {
  const task = await getTask(userId, taskId);
  const trimmed = text.trim();
  if (!trimmed) throw new HttpError(400, "INVALID_TEXT", "Checklist text is required.");
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${checklistItems.position}), -1)` })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId));
  const item = {
    id: createId(),
    taskId,
    text: trimmed,
    completed: 0,
    position: Number(row?.max ?? -1) + 1,
    createdAt: nowMs(),
  };
  await db.insert(checklistItems).values(item);
  await recordActivity({
    userId,
    module: "tasks",
    action: "CHECKLIST_UPDATED",
    entityType: "task",
    entityId: taskId,
    summary: `${task.number} checklist item added`,
  });
  return item;
}

export async function updateChecklistItem(
  userId: string,
  itemId: string,
  patch: { text?: string; completed?: boolean; position?: number },
) {
  const [item] = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  if (!item) throw new HttpError(404, "NOT_FOUND", "Checklist item not found.");
  const task = await getTask(userId, item.taskId);
  const next = {
    text: patch.text?.trim() || item.text,
    completed: patch.completed === undefined ? item.completed : patch.completed ? 1 : 0,
    position: patch.position ?? item.position,
  };
  await db.update(checklistItems).set(next).where(eq(checklistItems.id, itemId));
  if (patch.completed !== undefined) {
    await recordActivity({
      userId,
      module: "tasks",
      action: "CHECKLIST_UPDATED",
      entityType: "task",
      entityId: task.id,
      summary: `${task.number} checklist item ${patch.completed ? "completed" : "reopened"}`,
    });
  }
  return { ...item, ...next };
}

export async function deleteChecklistItem(userId: string, itemId: string) {
  const [item] = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  if (!item) throw new HttpError(404, "NOT_FOUND", "Checklist item not found.");
  const task = await getTask(userId, item.taskId);
  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));
  await recordActivity({
    userId,
    module: "tasks",
    action: "CHECKLIST_UPDATED",
    entityType: "task",
    entityId: task.id,
    summary: `${task.number} checklist item removed`,
  });
}
