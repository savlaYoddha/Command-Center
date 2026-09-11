import { and, asc, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { boardColumns, labels, tasks } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";

const DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "Blocked", "Done"];
const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: "Work", color: "#00BFFF" },
  { name: "Personal", color: "#7A5CFF" },
  { name: "Finance", color: "#FFD700" },
  { name: "Vehicle", color: "#00FF9D" },
  { name: "Bike", color: "#00BFFF" },
  { name: "Homelab", color: "#7A5CFF" },
  { name: "Important", color: "#FF3864" },
  { name: "Entertainment", color: "#8298A8" },
  { name: "Learning", color: "#00BFFF" },
];

export async function ensureBoard(userId: string): Promise<void> {
  const existing = await db.select({ id: boardColumns.id }).from(boardColumns).where(eq(boardColumns.userId, userId));
  if (existing.length === 0) {
    const now = nowMs();
    await db.insert(boardColumns).values(
      DEFAULT_COLUMNS.map((name, position) => ({
        id: createId(),
        userId,
        name,
        description: "",
        position,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  const existingLabels = await db.select({ id: labels.id }).from(labels).where(eq(labels.userId, userId));
  if (existingLabels.length === 0) {
    const now = nowMs();
    await db.insert(labels).values(
      DEFAULT_LABELS.map((label) => ({
        id: createId(),
        userId,
        name: label.name,
        color: label.color,
        createdAt: now,
      })),
    );
  }
}

export async function listColumns(userId: string) {
  await ensureBoard(userId);
  return db
    .select()
    .from(boardColumns)
    .where(eq(boardColumns.userId, userId))
    .orderBy(boardColumns.position);
}

export async function createColumn(userId: string, name: string, description = "") {
  await ensureBoard(userId);
  const current = await listColumns(userId);
  const now = nowMs();
  const column = {
    id: createId(),
    userId,
    name: name.trim(),
    description: description.trim(),
    position: current.length,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(boardColumns).values(column);
  await recordActivity({
    userId,
    module: "tasks",
    action: "COLUMN_CREATED",
    entityType: "column",
    entityId: column.id,
    summary: `Column created: ${column.name}`,
  });
  await normalizeColumnPositions(userId);
  return column;
}

export async function renameColumn(userId: string, columnId: string, name: string, description?: string) {
  const [column] = await db
    .select()
    .from(boardColumns)
    .where(and(eq(boardColumns.id, columnId), eq(boardColumns.userId, userId)));
  if (!column) throw new HttpError(404, "NOT_FOUND", "Column not found.");
  const nextName = name.trim();
  const nextDescription = description === undefined ? column.description : description.trim();
  await db
    .update(boardColumns)
    .set({ name: nextName, description: nextDescription, updatedAt: nowMs() })
    .where(eq(boardColumns.id, columnId));
  await recordActivity({
    userId,
    module: "tasks",
    action: "COLUMN_RENAMED",
    entityType: "column",
    entityId: columnId,
    summary: `Column renamed: ${column.name} → ${nextName}`,
  });
  return { ...column, name: nextName, description: nextDescription };
}

export async function reorderColumns(userId: string, orderedIds: string[]) {
  const current = await listColumns(userId);
  if (orderedIds.length !== current.length || current.some((col) => !orderedIds.includes(col.id))) {
    throw new HttpError(400, "INVALID_ORDER", "Column order does not match the board.");
  }
  const now = nowMs();
  for (const [position, id] of orderedIds.entries()) {
    await db.update(boardColumns).set({ position, updatedAt: now }).where(eq(boardColumns.id, id));
  }
  return listColumns(userId);
}

export async function deleteColumn(userId: string, columnId: string, destinationColumnId?: string) {
  const current = await listColumns(userId);
  if (current.length <= 1) {
    throw new HttpError(400, "LAST_COLUMN", "The board must keep at least one column.");
  }
  const target = current.find((col) => col.id === columnId);
  if (!target) throw new HttpError(404, "NOT_FOUND", "Column not found.");

  const moved = await db.select().from(tasks).where(and(eq(tasks.columnId, columnId), eq(tasks.userId, userId)));
  if (moved.length > 0) {
    if (!destinationColumnId) {
      throw new HttpError(400, "DESTINATION_REQUIRED", "Select a destination column for existing tasks.");
    }
    if (destinationColumnId === columnId) {
      throw new HttpError(400, "INVALID_DESTINATION", "Destination must be a different column.");
    }
    const destination = current.find((col) => col.id === destinationColumnId);
    if (!destination) throw new HttpError(404, "NOT_FOUND", "Destination column not found.");
    const maxPos = await db.select({ position: tasks.position }).from(tasks).where(eq(tasks.columnId, destination.id));
    let nextPos = maxPos.reduce((max, row) => Math.max(max, row.position), -1) + 1;
    for (const task of moved) {
      await db
        .update(tasks)
        .set({ columnId: destination.id, position: nextPos, updatedAt: nowMs() })
        .where(eq(tasks.id, task.id));
      nextPos += 1;
    }
  }

  await db.delete(boardColumns).where(and(eq(boardColumns.id, columnId), eq(boardColumns.userId, userId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "COLUMN_DELETED",
    entityType: "column",
    entityId: columnId,
    summary: `Column deleted: ${target.name}`,
  });
  if (moved.length > 0 && destinationColumnId) {
    await normalizeTaskPositions(destinationColumnId);
  }
  await normalizeColumnPositions(userId);
}

export async function normalizeColumnPositions(userId: string) {
  const current = await listColumns(userId);
  const now = nowMs();
  for (const [position, column] of current.entries()) {
    if (column.position !== position) {
      await db.update(boardColumns).set({ position, updatedAt: now }).where(eq(boardColumns.id, column.id));
    }
  }
}

export async function normalizeTaskPositions(columnId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.columnId, columnId))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
  const now = nowMs();
  for (const [position, row] of rows.entries()) {
    if (row.position !== position) {
      await db.update(tasks).set({ position, updatedAt: now }).where(eq(tasks.id, row.id));
    }
  }
}

export async function assertColumnOwner(userId: string, columnId: string) {
  const [column] = await db
    .select()
    .from(boardColumns)
    .where(and(eq(boardColumns.id, columnId), eq(boardColumns.userId, userId)));
  if (!column) throw new HttpError(404, "NOT_FOUND", "Column not found.");
  return column;
}
