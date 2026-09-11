import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../database/index.js";
import {
  activity,
  attachments,
  boardColumns,
  checklistItems,
  comments,
  labels,
  savedFilters,
  taskLabels,
  tasks,
} from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { formatTaskNumber } from "./tasks.service.js";
import { ensureBoard } from "./columns.service.js";

export const TASKS_BACKUP_SCHEMA = 1;

export type TasksBackup = {
  schemaVersion: number;
  application: "COMMANDCENTER";
  exportedAt: string;
  data: {
    columns: Array<{
      id: string;
      name: string;
      description: string;
      position: number;
    }>;
    labels: Array<{ id: string; name: string; color: string }>;
    tasks: Array<{
      id: string;
      number: number;
      title: string;
      description: string;
      priority: string;
      columnId: string;
      position: number;
      startDate: string | null;
      dueDate: string | null;
      archived?: number;
      completedAt?: number | null;
      labelIds: string[];
    }>;
    checklists: Array<{ id: string; taskId: string; text: string; completed: number; position: number }>;
    comments: Array<{ id: string; taskId: string; content: string; createdAt: number; updatedAt: number }>;
    activity: Array<{ id: string; action: string; summary: string; entityId: string | null; createdAt: number }>;
    savedFilters: Array<{ id: string; name: string; payloadJson: string }>;
    preferences: Record<string, unknown>;
  };
};

export async function exportTasks(userId: string, preferences: Record<string, unknown> = {}): Promise<TasksBackup> {
  await ensureBoard(userId);
  const columnRows = await db.select().from(boardColumns).where(eq(boardColumns.userId, userId)).orderBy(boardColumns.position);
  const labelRows = await db.select().from(labels).where(eq(labels.userId, userId));
  const taskRows = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const taskIds = taskRows.map((row) => row.id);
  const links = taskIds.length
    ? await db.select().from(taskLabels).where(inArray(taskLabels.taskId, taskIds))
    : [];
  const checks = taskIds.length
    ? await db.select().from(checklistItems).where(inArray(checklistItems.taskId, taskIds))
    : [];
  const commentRows = taskIds.length ? await db.select().from(comments).where(inArray(comments.taskId, taskIds)) : [];
  const activityRows = await db.select().from(activity).where(and(eq(activity.userId, userId), eq(activity.module, "tasks")));
  const filterRows = await db.select().from(savedFilters).where(eq(savedFilters.userId, userId));
  const labelsByTask = new Map<string, string[]>();
  for (const link of links) {
    const current = labelsByTask.get(link.taskId) ?? [];
    current.push(link.labelId);
    labelsByTask.set(link.taskId, current);
  }

  return {
    schemaVersion: TASKS_BACKUP_SCHEMA,
    application: "COMMANDCENTER",
    exportedAt: new Date().toISOString(),
    data: {
      columns: columnRows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        position: row.position,
      })),
      labels: labelRows.map((row) => ({ id: row.id, name: row.name, color: row.color })),
      tasks: taskRows.map((row) => ({
        id: row.id,
        number: row.number,
        title: row.title,
        description: row.description,
        priority: row.priority,
        columnId: row.columnId,
        position: row.position,
        startDate: row.startDate,
        dueDate: row.dueDate,
        archived: row.archived,
        completedAt: row.completedAt,
        labelIds: labelsByTask.get(row.id) ?? [],
      })),
      checklists: checks.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        text: row.text,
        completed: row.completed,
        position: row.position,
      })),
      comments: commentRows.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      activity: activityRows.map((row) => ({
        id: row.id,
        action: row.action,
        summary: row.summary,
        entityId: row.entityId,
        createdAt: row.createdAt,
      })),
      savedFilters: filterRows.map((row) => ({ id: row.id, name: row.name, payloadJson: row.payloadJson })),
      preferences,
    },
  };
}

function assertBackup(payload: unknown): TasksBackup {
  if (!payload || typeof payload !== "object") throw new HttpError(400, "INVALID_BACKUP", "Backup file is not valid JSON.");
  const file = payload as TasksBackup;
  if (file.application !== "COMMANDCENTER") {
    throw new HttpError(400, "INVALID_BACKUP", "Backup is not a COMMANDCENTER export.");
  }
  if (file.schemaVersion !== TASKS_BACKUP_SCHEMA) {
    throw new HttpError(400, "INVALID_BACKUP", "Unsupported backup schema version.");
  }
  if (!file.data?.columns?.length) {
    throw new HttpError(400, "INVALID_BACKUP", "Backup must include at least one column.");
  }
  return file;
}

async function wipeTasks(userId: string) {
  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId));
  const ids = existing.map((row) => row.id);
  if (ids.length) {
    await db.delete(taskLabels).where(inArray(taskLabels.taskId, ids));
    await db.delete(checklistItems).where(inArray(checklistItems.taskId, ids));
    await db.delete(comments).where(inArray(comments.taskId, ids));
    await db.delete(attachments).where(inArray(attachments.taskId, ids));
    await db.delete(tasks).where(eq(tasks.userId, userId));
  }
  await db.delete(savedFilters).where(eq(savedFilters.userId, userId));
  await db.delete(labels).where(eq(labels.userId, userId));
  await db.delete(boardColumns).where(eq(boardColumns.userId, userId));
}

export async function restoreTasks(userId: string, payload: unknown, mode: "merge" | "replace") {
  const file = assertBackup(payload);
  const now = nowMs();
  if (mode === "replace") {
    await wipeTasks(userId);
  }

  const idMap = new Map<string, string>();
  const remap = (id: string) => idMap.get(id) ?? id;

  const existingColumns = await db.select().from(boardColumns).where(eq(boardColumns.userId, userId));
  const existingLabels = await db.select().from(labels).where(eq(labels.userId, userId));
  const existingTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const ownedColumn = new Set(existingColumns.map((row) => row.id));
  const ownedLabel = new Set(existingLabels.map((row) => row.id));
  const ownedTask = new Set(existingTasks.map((row) => row.id));

  for (const [index, column] of file.data.columns.entries()) {
    const id = ownedColumn.has(column.id) || mode === "replace" ? column.id : createId();
    if (id !== column.id) idMap.set(column.id, id);
    if (ownedColumn.has(id)) {
      await db
        .update(boardColumns)
        .set({ name: column.name, description: column.description ?? "", position: index, updatedAt: now })
        .where(eq(boardColumns.id, id));
    } else {
      await db.insert(boardColumns).values({
        id,
        userId,
        name: column.name,
        description: column.description ?? "",
        position: index,
        createdAt: now,
        updatedAt: now,
      });
      ownedColumn.add(id);
    }
  }

  for (const label of file.data.labels ?? []) {
    const id = ownedLabel.has(label.id) || mode === "replace" ? label.id : createId();
    if (id !== label.id) idMap.set(label.id, id);
    if (ownedLabel.has(id)) {
      await db.update(labels).set({ name: label.name, color: label.color }).where(eq(labels.id, id));
    } else {
      await db.insert(labels).values({ id, userId, name: label.name, color: label.color, createdAt: now });
      ownedLabel.add(id);
    }
  }

  const maxNumber = existingTasks.reduce((max, row) => Math.max(max, row.number), 0);
  let nextNumber = maxNumber + 1;

  for (const task of file.data.tasks ?? []) {
    const columnId = remap(task.columnId);
    if (!ownedColumn.has(columnId) && !file.data.columns.some((col) => remap(col.id) === columnId)) {
      throw new HttpError(400, "INVALID_BACKUP", `Task ${formatTaskNumber(task.number)} references a missing column.`);
    }
    let id = task.id;
    if (ownedTask.has(id) || mode === "replace") {
      id = task.id;
    } else {
      id = createId();
      idMap.set(task.id, id);
    }
    const number = ownedTask.has(task.id) || mode === "replace" ? task.number : nextNumber++;
    const values = {
      userId,
      columnId,
      number,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      startDate: task.startDate ?? null,
      dueDate: task.dueDate ?? null,
      position: task.position ?? 0,
      archived: task.archived ? 1 : 0,
      completedAt: task.completedAt ?? null,
      updatedAt: now,
    };
    if (ownedTask.has(id)) {
      await db.update(tasks).set(values).where(eq(tasks.id, id));
    } else {
      await db.insert(tasks).values({ id, createdAt: now, ...values });
      ownedTask.add(id);
    }
    await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
    await db.delete(checklistItems).where(eq(checklistItems.taskId, id));
    await db.delete(comments).where(eq(comments.taskId, id));
    for (const labelId of task.labelIds ?? []) {
      await db.insert(taskLabels).values({ taskId: id, labelId: remap(labelId) }).onConflictDoNothing();
    }
  }

  for (const item of file.data.checklists ?? []) {
    const taskId = remap(item.taskId);
    if (!ownedTask.has(taskId)) continue;
    const id = createId();
    await db.insert(checklistItems).values({
      id,
      taskId,
      text: item.text,
      completed: item.completed ? 1 : 0,
      position: item.position,
      createdAt: now,
    });
  }

  for (const comment of file.data.comments ?? []) {
    const taskId = remap(comment.taskId);
    if (!ownedTask.has(taskId)) continue;
    await db.insert(comments).values({
      id: createId(),
      taskId,
      userId,
      content: comment.content,
      createdAt: comment.createdAt ?? now,
      updatedAt: comment.updatedAt ?? now,
    });
  }

  for (const filter of file.data.savedFilters ?? []) {
    await db.insert(savedFilters).values({
      id: createId(),
      userId,
      name: filter.name,
      payloadJson: filter.payloadJson,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { restored: true, mode, taskCount: file.data.tasks?.length ?? 0 };
}
