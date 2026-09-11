import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { attachments } from "../../database/schema/index.js";
import { config } from "../../config.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { getTask } from "./tasks.service.js";

const ALLOWED_EXT = new Set([".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".xlsx"]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function tasksUploadDir(taskId: string): string {
  return path.join(config.uploadsDir, "tasks", taskId);
}

function extension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export async function listAttachments(userId: string, taskId: string) {
  await getTask(userId, taskId);
  return db.select().from(attachments).where(eq(attachments.taskId, taskId)).orderBy(attachments.createdAt);
}

export async function addAttachment(
  userId: string,
  taskId: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
) {
  const task = await getTask(userId, taskId);
  const ext = extension(file.originalname);
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    throw new HttpError(400, "UNSUPPORTED_FILE", "File type is not allowed.");
  }
  const id = createId();
  const storedName = `${id}${ext}`;
  const dir = tasksUploadDir(taskId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, storedName), file.buffer);
  const row = {
    id,
    taskId,
    originalName: file.originalname,
    storedName,
    mimeType: file.mimetype,
    size: file.size,
    createdAt: nowMs(),
  };
  await db.insert(attachments).values(row);
  await recordActivity({
    userId,
    module: "tasks",
    action: "ATTACHMENT_ADDED",
    entityType: "task",
    entityId: taskId,
    summary: `${task.number} attachment added: ${file.originalname}`,
  });
  return row;
}

export async function getAttachmentFile(userId: string, attachmentId: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
  if (!row) throw new HttpError(404, "NOT_FOUND", "Attachment not found.");
  await getTask(userId, row.taskId);
  const filePath = path.join(tasksUploadDir(row.taskId), row.storedName);
  if (!filePath.startsWith(path.join(config.uploadsDir, "tasks")) || !fs.existsSync(filePath)) {
    throw new HttpError(404, "NOT_FOUND", "Attachment not found.");
  }
  return { row, filePath };
}

export async function deleteAttachment(userId: string, attachmentId: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
  if (!row) throw new HttpError(404, "NOT_FOUND", "Attachment not found.");
  const task = await getTask(userId, row.taskId);
  const filePath = path.join(tasksUploadDir(row.taskId), row.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await db.delete(attachments).where(and(eq(attachments.id, attachmentId), eq(attachments.taskId, row.taskId)));
  await recordActivity({
    userId,
    module: "tasks",
    action: "ATTACHMENT_DELETED",
    entityType: "task",
    entityId: task.id,
    summary: `${task.number} attachment removed: ${row.originalName}`,
  });
}
