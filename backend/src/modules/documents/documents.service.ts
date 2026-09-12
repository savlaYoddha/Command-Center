import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { documents } from "../../database/schema/index.js";
import { config } from "../../config.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";
import { sendMail } from "../../utils/mail.js";

const ALLOWED_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".md",
  ".csv",
  ".docx",
  ".xlsx",
  ".eml",
]);
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "message/rfc822",
]);

const VIEWABLE_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export type DocumentFilters = {
  folder?: string;
  category?: string;
  tag?: string;
  q?: string;
};

function documentsDir(): string {
  return path.join(config.uploadsDir, "documents");
}

function extension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function normalizeFolder(folder: string): string {
  const clean = folder.trim().replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "").slice(0, 60);
  return clean;
}

function resolveDocPath(row: { id: string; storedName: string }): string {
  const dir = documentsDir();
  const filePath = path.join(dir, row.storedName);
  const relative = path.relative(dir, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new HttpError(404, "NOT_FOUND", "Document not found.");
  }
  return filePath;
}

export async function listDocuments(userId: string, filters: DocumentFilters) {
  const conditions = [eq(documents.userId, userId)];
  if (filters.folder !== undefined) conditions.push(eq(documents.folder, filters.folder));
  if (filters.category !== undefined) conditions.push(eq(documents.category, filters.category));
  if (filters.tag !== undefined) {
    conditions.push(eq(documents.tags, [filters.tag]));
  }
  let rows = await db.select().from(documents).where(and(...conditions)).orderBy(documents.createdAt);
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.folder.toLowerCase().includes(q) ||
        row.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }
  return rows.map((row) => ({
    ...row,
    viewable: VIEWABLE_MIME.has(row.mimeType),
  }));
}

export async function getDocument(userId: string, documentId: string) {
  const [row] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  if (!row) throw new HttpError(404, "NOT_FOUND", "Document not found.");
  return { row, filePath: resolveDocPath(row) };
}

export async function createDocument(
  userId: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  meta: { folder?: string; category?: string; name?: string; tags?: string[]; notes?: string },
) {
  const ext = extension(file.originalname);
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    throw new HttpError(400, "UNSUPPORTED_FILE", "File type is not allowed.");
  }
  const id = createId();
  const storedName = `${id}${ext}`;
  const dir = documentsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, storedName), file.buffer);

  const folder = normalizeFolder(meta.folder ?? "");
  const row = {
    id,
    userId,
    folder,
    category: (meta.category ?? "other").trim().toLowerCase().slice(0, 40) || "other",
    name: (meta.name ?? file.originalname).trim().slice(0, 200) || file.originalname,
    storedName,
    mimeType: file.mimetype,
    size: file.size,
    tags: (meta.tags ?? []).map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean),
    notes: (meta.notes ?? "").trim().slice(0, 5000),
    createdAt: nowMs(),
    updatedAt: nowMs(),
  };
  await db.insert(documents).values(row);
  await recordActivity({
    userId,
    module: "documents",
    action: "DOCUMENT_UPLOADED",
    entityType: "document",
    entityId: id,
    summary: `Document uploaded: ${row.name}${folder ? ` (${folder})` : ""}`,
  });
  return { ...row, viewable: VIEWABLE_MIME.has(row.mimeType) };
}

export async function updateDocument(
  userId: string,
  documentId: string,
  patch: { folder?: string; category?: string; name?: string; tags?: string[]; notes?: string },
) {
  await getDocument(userId, documentId);
  const changes: Record<string, unknown> = { updatedAt: nowMs() };
  if (patch.folder !== undefined) changes.folder = normalizeFolder(patch.folder);
  if (patch.category !== undefined) {
    changes.category = patch.category.trim().toLowerCase().slice(0, 40) || "other";
  }
  if (patch.name !== undefined) changes.name = patch.name.trim().slice(0, 200);
  if (patch.notes !== undefined) changes.notes = patch.notes.trim().slice(0, 5000);
  if (patch.tags !== undefined) {
    changes.tags = patch.tags.map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean);
  }
  await db
    .update(documents)
    .set(changes)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  const [updated] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Document not found.");
  return { ...updated, viewable: VIEWABLE_MIME.has(updated.mimeType) };
}

export async function deleteDocument(userId: string, documentId: string) {
  const { row, filePath } = await getDocument(userId, documentId);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await db.delete(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  await recordActivity({
    userId,
    module: "documents",
    action: "DOCUMENT_DELETED",
    entityType: "document",
    entityId: documentId,
    summary: `Document removed: ${row.name}`,
  });
  return { deleted: true };
}

export async function zipDocuments(userId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) throw new HttpError(400, "NO_DOCUMENTS", "Select at least one document.");
  const files: Array<{ name: string; filePath: string }> = [];
  for (const id of unique) {
    const { row, filePath } = await getDocument(userId, id);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "NOT_FOUND", `Document missing on disk: ${row.name}`);
    files.push({ name: row.name, filePath });
  }
  return { files, timestamp: nowMs() };
}

export async function emailDocuments(
  userId: string,
  ids: string[],
  options: { to: string; subject?: string; body?: string },
) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) throw new HttpError(400, "NO_DOCUMENTS", "Select at least one document.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.to)) {
    throw new HttpError(400, "INVALID_EMAIL", "Recipient email address is invalid.");
  }
  const attachments: Array<{ filename: string; content: Buffer }> = [];
  const names: string[] = [];
  for (const id of unique) {
    const { row, filePath } = await getDocument(userId, id);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "NOT_FOUND", `Document missing on disk: ${row.name}`);
    attachments.push({ filename: row.name, content: fs.readFileSync(filePath) });
    names.push(row.name);
  }
  const subject =
    options.subject?.trim().slice(0, 200) || (names.length === 1 ? names[0] : `${names.length} documents from COMMANDCENTER`);
  const body = options.body?.trim().slice(0, 5000) || "See attached documents from COMMANDCENTER.";
  await sendMail({ to: options.to, subject, body, attachments });
  return { sent: true, to: options.to, attachments: attachments.length };
}