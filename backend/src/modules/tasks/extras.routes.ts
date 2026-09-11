import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import { deleteChecklistItem, updateChecklistItem } from "./checklist.service.js";
import { deleteComment, updateComment } from "./comments.service.js";
import { deleteAttachment, getAttachmentFile } from "./attachments.service.js";
import { createSavedFilter, deleteSavedFilter, listSavedFilters, updateSavedFilter } from "./filters.service.js";

export const checklistRouter = Router();
checklistRouter.use(requireAuth);
checklistRouter.use((req, res, next) => requireScope("tasks:write")(req, res, next));
checklistRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = z
    .object({
      text: z.string().min(1).max(300).optional(),
      completed: z.boolean().optional(),
      position: z.number().int().min(0).optional(),
    })
    .parse(req.body);
  res.json(ok(await updateChecklistItem(auth.userId, String(req.params.id), body)));
});
checklistRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteChecklistItem(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});

export const commentsRouter = Router();
commentsRouter.use(requireAuth);
commentsRouter.use((req, res, next) => requireScope("tasks:write")(req, res, next));
commentsRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
  res.json(ok(await updateComment(auth.userId, String(req.params.id), body.content)));
});
commentsRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteComment(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});

export const attachmentsRouter = Router();
attachmentsRouter.use(requireAuth);
attachmentsRouter.use((req, res, next) => {
  requireScope(req.method === "GET" ? "tasks:read" : "tasks:write")(req, res, next);
});
attachmentsRouter.get("/:id", async (req, res) => {
  const auth = getAuth(req);
  const { row, filePath } = await getAttachmentFile(auth.userId, String(req.params.id));
  res.download(filePath, row.originalName);
});
attachmentsRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteAttachment(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});

export const savedFiltersRouter = Router();
savedFiltersRouter.use(requireAuth);
savedFiltersRouter.use((req, res, next) => {
  requireScope(req.method === "GET" ? "tasks:read" : "tasks:write")(req, res, next);
});
savedFiltersRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listSavedFilters(auth.userId)));
});
savedFiltersRouter.post("/", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ name: z.string().min(1).max(80), payload: z.unknown() }).parse(req.body);
  res.status(201).json(ok(await createSavedFilter(auth.userId, body.name, body.payload)));
});
savedFiltersRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ name: z.string().min(1).max(80).optional(), payload: z.unknown().optional() }).parse(req.body);
  res.json(ok(await updateSavedFilter(auth.userId, String(req.params.id), body)));
});
savedFiltersRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteSavedFilter(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});