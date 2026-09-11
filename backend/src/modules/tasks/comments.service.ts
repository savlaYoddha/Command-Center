import { and, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { comments } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { getTask } from "./tasks.service.js";

export async function listComments(userId: string, taskId: string) {
  await getTask(userId, taskId);
  return db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(comments.createdAt);
}

export async function addComment(userId: string, taskId: string, content: string) {
  const task = await getTask(userId, taskId);
  const trimmed = content.trim();
  if (!trimmed) throw new HttpError(400, "INVALID_CONTENT", "Comment cannot be empty.");
  const now = nowMs();
  const comment = {
    id: createId(),
    taskId,
    userId,
    content: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(comments).values(comment);
  await recordActivity({
    userId,
    module: "tasks",
    action: "COMMENT_ADDED",
    entityType: "task",
    entityId: taskId,
    summary: `${task.number} comment added`,
  });
  return comment;
}

export async function updateComment(userId: string, commentId: string, content: string) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!comment) throw new HttpError(404, "NOT_FOUND", "Comment not found.");
  if (comment.userId !== userId) throw new HttpError(403, "FORBIDDEN", "You can only edit your comments.");
  await getTask(userId, comment.taskId);
  const trimmed = content.trim();
  if (!trimmed) throw new HttpError(400, "INVALID_CONTENT", "Comment cannot be empty.");
  await db.update(comments).set({ content: trimmed, updatedAt: nowMs() }).where(eq(comments.id, commentId));
  return { ...comment, content: trimmed, updatedAt: nowMs() };
}

export async function deleteComment(userId: string, commentId: string) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
  if (!comment) throw new HttpError(404, "NOT_FOUND", "Comment not found.");
  if (comment.userId !== userId) throw new HttpError(403, "FORBIDDEN", "You can only delete your comments.");
  await getTask(userId, comment.taskId);
  await db.delete(comments).where(and(eq(comments.id, commentId), eq(comments.userId, userId)));
}
