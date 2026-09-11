import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { config } from "../../config.js";
import { db } from "../../database/index.js";
import {
  attachments,
  boardColumns,
  checklistItems,
  comments,
  labels,
  taskLabels,
  tasks,
} from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { assertColumnOwner, ensureBoard, normalizeTaskPositions } from "./columns.service.js";
import { assertLabelOwner } from "./labels.service.js";
import { DONE_ARCHIVE_AFTER_MS, isDoneColumnName } from "./archive.policy.js";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type DueFilter = "any" | "today" | "week" | "overdue" | "none";
export type LabelMode = "any" | "all";

export type TaskQuery = {
  search?: string;
  labelIds?: string[];
  labelMode?: LabelMode;
  priority?: TaskPriority;
  columnId?: string;
  due?: DueFilter;
  archived?: boolean;
  trash?: boolean;
};

function localDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function doneColumnIds(userId: string): Promise<string[]> {
  const columns = await db.select().from(boardColumns).where(eq(boardColumns.userId, userId));
  return columns.filter((col) => isDoneColumnName(col.name)).map((col) => col.id);
}

export async function archiveStaleDoneTasks(userId: string): Promise<number> {
  const doneIds = await doneColumnIds(userId);
  if (doneIds.length === 0) return 0;
  const cutoff = nowMs() - DONE_ARCHIVE_AFTER_MS;
  const stale = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.archived, 0),
        isNull(tasks.deletedAt),
        inArray(tasks.columnId, doneIds),
        lte(tasks.completedAt, cutoff),
      ),
    );
  const ids = stale
    .filter((row) => Boolean(row.id))
    .map((row) => row.id);
  if (ids.length === 0) return 0;
  const now = nowMs();
  await db.update(tasks).set({ archived: 1, archivedAt: now, updatedAt: now }).where(inArray(tasks.id, ids));
  return ids.length;
}

export async function archiveTask(userId: string, taskId: string) {
  const current = await getTask(userId, taskId);
  const now = nowMs();
  await db
    .update(tasks)
    .set({ archived: 1, archivedAt: now, deletedAt: null, updatedAt: now })
    .where(and(eq(tasks.id, current.id), eq(tasks.userId, userId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_ARCHIVED",
    entityType: "task",
    entityId: current.id,
    summary: `${current.number} archived`,
  });
  return getTask(userId, current.id);
}

export async function unarchiveTask(userId: string, taskId: string) {
  const current = await getTask(userId, taskId);
  const doneIds = await doneColumnIds(userId);
  const targetColumnId = doneIds.includes(current.columnId) ? current.columnId : (doneIds[0] ?? current.columnId);
  const position = await nextPosition(targetColumnId);
  await db
    .update(tasks)
    .set({
      archived: 0,
      archivedAt: null,
      deletedAt: null,
      columnId: targetColumnId,
      position,
      completedAt: nowMs(),
      updatedAt: nowMs(),
    })
    .where(and(eq(tasks.id, current.id), eq(tasks.userId, userId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_UNARCHIVED",
    entityType: "task",
    entityId: current.id,
    summary: `${current.number} restored from archive`,
  });
  return getTask(userId, current.id);
}

export async function restoreArchivedTask(userId: string, taskId: string) {
  return unarchiveTask(userId, taskId);
}

export async function trashTask(userId: string, taskId: string) {
  const current = await getTask(userId, taskId);
  const now = nowMs();
  await db
    .update(tasks)
    .set({
      deletedAt: now,
      previousColumnId: current.columnId,
      updatedAt: now,
    })
    .where(and(eq(tasks.id, current.id), eq(tasks.userId, userId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_TRASHED",
    entityType: "task",
    entityId: current.id,
    summary: `${current.number} moved to recycle bin`,
  });
  return getTask(userId, current.id);
}

export async function restoreTrashedTask(userId: string, taskId: string, destinationColumnId?: string) {
  const current = await getTask(userId, taskId);
  const columns = await db.select().from(boardColumns).where(eq(boardColumns.userId, userId));
  const owned = new Set(columns.map((col) => col.id));
  const preferred = destinationColumnId ?? current.previousColumnId ?? current.columnId;
  const targetColumnId = owned.has(preferred) ? preferred : (columns[0]?.id ?? current.columnId);
  const position = await nextPosition(targetColumnId);
  await db
    .update(tasks)
    .set({
      deletedAt: null,
      archived: 0,
      archivedAt: null,
      columnId: targetColumnId,
      position,
      previousColumnId: null,
      updatedAt: nowMs(),
    })
    .where(and(eq(tasks.id, current.id), eq(tasks.userId, userId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_RESTORED",
    entityType: "task",
    entityId: current.id,
    summary: `${current.number} restored from recycle bin`,
  });
  return getTask(userId, current.id);
}

function startOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function endOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTaskNumber(number: number): string {
  return `TASK-${String(number).padStart(3, "0")}`;
}

async function nextTaskNumber(userId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));
  return Number(row?.max ?? 0) + 1;
}

async function nextPosition(columnId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.position}), -1)` })
    .from(tasks)
    .where(eq(tasks.columnId, columnId));
  return Number(row?.max ?? -1) + 1;
}

export async function listTasks(userId: string, query: TaskQuery = {}) {
  await ensureBoard(userId);
  await archiveStaleDoneTasks(userId);
  const rows = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(tasks.position, tasks.createdAt);
  const columns = await db.select().from(boardColumns).where(eq(boardColumns.userId, userId));
  const columnNames = new Map(columns.map((col) => [col.id, col.name]));
  let filtered = rows.filter((task) => {
    const trashed = Boolean(task.deletedAt);
    if (query.trash) return trashed;
    if (trashed) return false;
    return query.archived ? task.archived === 1 : task.archived === 0;
  });

  if (query.columnId) filtered = filtered.filter((task) => task.columnId === query.columnId);
  if (query.priority) filtered = filtered.filter((task) => task.priority === query.priority);

  const today = localDate();
  if (query.due === "today") filtered = filtered.filter((task) => task.dueDate === today);
  if (query.due === "none") filtered = filtered.filter((task) => !task.dueDate);
  if (query.due === "overdue") filtered = filtered.filter((task) => Boolean(task.dueDate && task.dueDate < today));
  if (query.due === "week") {
    const from = startOfWeek();
    const to = endOfWeek();
    filtered = filtered.filter((task) => Boolean(task.dueDate && task.dueDate >= from && task.dueDate <= to));
  }

  const ids = filtered.map((task) => task.id);
  const labelRows =
    ids.length === 0
      ? []
      : await db
          .select({
            taskId: taskLabels.taskId,
            id: labels.id,
            name: labels.name,
            color: labels.color,
          })
          .from(taskLabels)
          .innerJoin(labels, eq(labels.id, taskLabels.labelId))
          .where(inArray(taskLabels.taskId, ids));

  const labelsByTask = new Map<string, Array<{ id: string; name: string; color: string }>>();
  for (const row of labelRows) {
    const list = labelsByTask.get(row.taskId) ?? [];
    list.push({ id: row.id, name: row.name, color: row.color });
    labelsByTask.set(row.taskId, list);
  }

  if (query.labelIds && query.labelIds.length > 0) {
    filtered = filtered.filter((task) => {
      const assigned = new Set((labelsByTask.get(task.id) ?? []).map((item) => item.id));
      if (query.labelMode === "all") return query.labelIds!.every((id) => assigned.has(id));
      return query.labelIds!.some((id) => assigned.has(id));
    });
  }

  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    const commentRows =
      ids.length === 0
        ? []
        : await db.select({ taskId: comments.taskId, content: comments.content }).from(comments).where(inArray(comments.taskId, ids));
    const commentsByTask = new Map<string, string[]>();
    for (const row of commentRows) {
      const list = commentsByTask.get(row.taskId) ?? [];
      list.push(row.content);
      commentsByTask.set(row.taskId, list);
    }
    filtered = filtered.filter((task) => {
      const haystack = [
        formatTaskNumber(task.number),
        task.title,
        task.description,
        ...(labelsByTask.get(task.id) ?? []).map((item) => item.name),
        ...(commentsByTask.get(task.id) ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  const keptIds = filtered.map((task) => task.id);
  const checklistRows =
    keptIds.length === 0
      ? []
      : await db
          .select({ taskId: checklistItems.taskId, completed: checklistItems.completed })
          .from(checklistItems)
          .where(inArray(checklistItems.taskId, keptIds));
  const commentCounts =
    keptIds.length === 0
      ? []
      : await db
          .select({ taskId: comments.taskId, count: sql<number>`count(*)` })
          .from(comments)
          .where(inArray(comments.taskId, keptIds))
          .groupBy(comments.taskId);
  const attachmentCounts =
    keptIds.length === 0
      ? []
      : await db
          .select({ taskId: attachments.taskId, count: sql<number>`count(*)` })
          .from(attachments)
          .where(inArray(attachments.taskId, keptIds))
          .groupBy(attachments.taskId);

  const checklistMap = new Map<string, { done: number; total: number }>();
  for (const row of checklistRows) {
    const current = checklistMap.get(row.taskId) ?? { done: 0, total: 0 };
    current.total += 1;
    if (row.completed) current.done += 1;
    checklistMap.set(row.taskId, current);
  }
  const commentMap = new Map(commentCounts.map((row) => [row.taskId, Number(row.count)]));
  const attachmentMap = new Map(attachmentCounts.map((row) => [row.taskId, Number(row.count)]));

  return filtered.map((task) => ({
    id: task.id,
    number: formatTaskNumber(task.number),
    title: task.title,
    description: task.description,
    priority: task.priority as TaskPriority,
    columnId: task.columnId,
    columnName: columnNames.get(task.columnId) ?? "",
    position: task.position,
    startDate: task.startDate,
    dueDate: task.dueDate,
    archived: task.archived,
    archivedAt: task.archivedAt,
    deletedAt: task.deletedAt,
    previousColumnId: task.previousColumnId,
    completedAt: task.completedAt,
    labels: labelsByTask.get(task.id) ?? [],
    checklistDone: checklistMap.get(task.id)?.done ?? 0,
    checklistTotal: checklistMap.get(task.id)?.total ?? 0,
    commentCount: commentMap.get(task.id) ?? 0,
    attachmentCount: attachmentMap.get(task.id) ?? 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
}

export async function getTask(userId: string, taskRef: string) {
  const numbered = /^TASK-(\d+)$/i.exec(taskRef.trim());
  const [task] = numbered
    ? await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.number, Number(numbered[1]))))
    : await db.select().from(tasks).where(and(eq(tasks.id, taskRef), eq(tasks.userId, userId)));
  if (!task) throw new HttpError(404, "NOT_FOUND", "Task not found.");
  const taskId = task.id;
  const [column] = await db.select().from(boardColumns).where(eq(boardColumns.id, task.columnId));
  const assigned = await db
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(taskLabels)
    .innerJoin(labels, eq(labels.id, taskLabels.labelId))
    .where(eq(taskLabels.taskId, taskId));
  const checklist = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(checklistItems.position);
  const commentRows = await db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(comments.createdAt);
  const files = await db.select().from(attachments).where(eq(attachments.taskId, taskId)).orderBy(attachments.createdAt);
  return {
    ...task,
    number: formatTaskNumber(task.number),
    columnName: column?.name ?? "",
    labels: assigned,
    checklist,
    comments: commentRows,
    attachments: files,
  };
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    description?: string;
    columnId: string;
    priority?: TaskPriority;
    labelIds?: string[];
    startDate?: string | null;
    dueDate?: string | null;
  },
) {
  await ensureBoard(userId);
  const column = await assertColumnOwner(userId, input.columnId);
  const title = input.title.trim();
  if (!title) throw new HttpError(400, "INVALID_TITLE", "Title is required.");
  const now = nowMs();
  const task = {
    id: createId(),
    userId,
    columnId: column.id,
    number: await nextTaskNumber(userId),
    title,
    description: input.description ?? "",
    priority: input.priority ?? "medium",
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    position: await nextPosition(column.id),
    archived: 0,
    completedAt: isDoneColumnName(column.name) ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(tasks).values(task);
  if (input.labelIds?.length) {
    for (const labelId of input.labelIds) {
      await assertLabelOwner(userId, labelId);
    }
    await db.insert(taskLabels).values(input.labelIds.map((labelId) => ({ taskId: task.id, labelId })));
  }
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_CREATED",
    entityType: "task",
    entityId: task.id,
    summary: `${formatTaskNumber(task.number)} created`,
  });
  return getTask(userId, task.id);
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    startDate?: string | null;
    dueDate?: string | null;
    columnId?: string;
  },
) {
  const current = await getTask(userId, taskId);
  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: nowMs() };
  const events: string[] = [];
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new HttpError(400, "INVALID_TITLE", "Title is required.");
    updates.title = title;
  }
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.priority !== undefined && patch.priority !== current.priority) {
    events.push(`Priority changed: ${current.priority} → ${patch.priority}`);
    updates.priority = patch.priority;
  }
  if (patch.startDate !== undefined) updates.startDate = patch.startDate;
  if (patch.dueDate !== undefined) updates.dueDate = patch.dueDate;
  if (patch.columnId && patch.columnId !== current.columnId) {
    const column = await assertColumnOwner(userId, patch.columnId);
    updates.columnId = column.id;
    updates.position = await nextPosition(column.id);
    events.push(`Moved: ${current.columnName} → ${column.name}`);
    if (isDoneColumnName(column.name) && !isDoneColumnName(current.columnName)) updates.completedAt = nowMs();
    if (!isDoneColumnName(column.name) && isDoneColumnName(current.columnName)) {
      updates.completedAt = null;
      updates.archived = 0;
    }
  }
  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
  for (const summary of events) {
    await recordActivity({
      userId,
      module: "tasks",
      action: "TASK_UPDATED",
      entityType: "task",
      entityId: taskId,
      summary: `${current.number} ${summary}`,
      metadata: { summary },
    });
  }
  if (events.length === 0) {
    await recordActivity({
      userId,
      module: "tasks",
      action: "TASK_UPDATED",
      entityType: "task",
      entityId: taskId,
      summary: `${current.number} updated`,
    });
  }
  return getTask(userId, taskId);
}

export async function deleteTask(userId: string, taskId: string) {
  return trashTask(userId, taskId);
}

export async function permanentDeleteTask(userId: string, taskId: string) {
  const current = await getTask(userId, taskId);
  const dir = path.join(config.uploadsDir, "tasks", current.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  await db.delete(tasks).where(eq(tasks.id, taskId));
  await recordActivity({
    userId,
    module: "tasks",
    action: "TASK_DELETED",
    entityType: "task",
    entityId: taskId,
    summary: `${current.number} permanently deleted`,
  });
}

export async function moveTask(
  userId: string,
  taskId: string,
  input: { columnId: string; position: number; orderedIds: string[] },
) {
  const current = await getTask(userId, taskId);
  const column = await assertColumnOwner(userId, input.columnId);
  if (!input.orderedIds.includes(taskId)) {
    throw new HttpError(400, "INVALID_ORDER", "Moved task must be included in the column order.");
  }
  const now = nowMs();
  const enteringDone = isDoneColumnName(column.name) && !isDoneColumnName(current.columnName);
  const leavingDone = !isDoneColumnName(column.name) && isDoneColumnName(current.columnName);
  for (const [position, id] of input.orderedIds.entries()) {
    const patch: Partial<typeof tasks.$inferInsert> = {
      columnId: column.id,
      position,
      updatedAt: now,
    };
    if (id === taskId) {
      if (enteringDone) patch.completedAt = now;
      if (leavingDone) {
        patch.completedAt = null;
        patch.archived = 0;
      }
    }
    await db.update(tasks).set(patch).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  }
  if (current.columnId !== column.id) {
    await normalizeTaskPositions(current.columnId);
    await recordActivity({
      userId,
      module: "tasks",
      action: "TASK_MOVED",
      entityType: "task",
      entityId: taskId,
      summary: `${current.number} moved: ${current.columnName} → ${column.name}`,
    });
  }
  await normalizeTaskPositions(column.id);
  return listTasks(userId);
}

export async function addTaskLabel(userId: string, taskId: string, labelId: string) {
  const task = await getTask(userId, taskId);
  const label = await assertLabelOwner(userId, labelId);
  await db.insert(taskLabels).values({ taskId, labelId }).onConflictDoNothing();
  await recordActivity({
    userId,
    module: "tasks",
    action: "LABEL_ADDED",
    entityType: "task",
    entityId: taskId,
    summary: `${task.number} label added: ${label.name}`,
  });
  return getTask(userId, taskId);
}

export async function removeTaskLabel(userId: string, taskId: string, labelId: string) {
  const task = await getTask(userId, taskId);
  const label = await assertLabelOwner(userId, labelId);
  await db.delete(taskLabels).where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "LABEL_REMOVED",
    entityType: "task",
    entityId: taskId,
    summary: `${task.number} label removed: ${label.name}`,
  });
  return getTask(userId, taskId);
}

export async function taskStats(userId: string) {
  await ensureBoard(userId);
  const items = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.archived, 0), isNull(tasks.deletedAt)));
  const today = localDate();
  const doneIds = new Set((await doneColumnIds(userId)));
  const active = items.filter((task) => !doneIds.has(task.columnId)).length;
  const dueToday = items.filter((task) => task.dueDate === today && !doneIds.has(task.columnId)).length;
  const upcoming = items
    .filter((task) => task.dueDate && task.dueDate <= today && !doneIds.has(task.columnId))
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      module: "tasks",
      title: `${formatTaskNumber(task.number)} ${task.title}`,
      dueLabel: task.dueDate === today ? "DUE TODAY" : `DUE ${task.dueDate}`,
    }));
  return { active, dueToday, upcoming };
}
