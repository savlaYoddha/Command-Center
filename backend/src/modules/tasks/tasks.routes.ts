import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import {
  addTaskLabel,
  archiveTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  moveTask,
  permanentDeleteTask,
  removeTaskLabel,
  restoreTrashedTask,
  trashTask,
  unarchiveTask,
  updateTask,
  type DueFilter,
  type LabelMode,
  type TaskPriority,
} from "./tasks.service.js";
import { addChecklistItem, listChecklist } from "./checklist.service.js";
import { addComment, listComments } from "./comments.service.js";
import { addAttachment, listAttachments } from "./attachments.service.js";
import { listTaskActivity } from "./task-activity.service.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);
tasksRouter.use((req, res, next) => {
  const scope = req.method === "GET" ? "tasks:read" : req.method === "DELETE" ? "tasks:delete" : "tasks:write";
  requireScope(scope)(req, res, next);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const dateStamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();
const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(20000).optional(),
  columnId: z.string().uuid(),
  priority: prioritySchema.optional(),
  labelIds: z.array(z.string().uuid()).optional(),
  startDate: dateStamp,
  dueDate: dateStamp,
});
const updateSchema = createSchema.partial().omit({ labelIds: true });
const moveSchema = z.object({
  columnId: z.string().uuid(),
  position: z.number().int().min(0),
  orderedIds: z.array(z.string().uuid()).min(1),
});

tasksRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  const labelIds = typeof req.query.labelIds === "string" ? req.query.labelIds.split(",").filter(Boolean) : [];
  res.json(
    ok(
      await listTasks(auth.userId, {
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        labelIds,
        labelMode: (req.query.labelMode as LabelMode | undefined) ?? "any",
        priority: req.query.priority as TaskPriority | undefined,
        columnId: typeof req.query.columnId === "string" ? req.query.columnId : undefined,
        due: (req.query.due as DueFilter | undefined) ?? "any",
        archived: req.query.archived === "1" || req.query.archived === "true",
        trash: req.query.trash === "1" || req.query.trash === "true",
      }),
    ),
  );
});

tasksRouter.post("/", async (req, res) => {
  const auth = getAuth(req);
  const body = createSchema.parse(req.body);
  res.status(201).json(ok(await createTask(auth.userId, body)));
});

tasksRouter.get("/:id", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await getTask(auth.userId, String(req.params.id))));
});

tasksRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateTask(auth.userId, String(req.params.id), body)));
});

tasksRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateTask(auth.userId, String(req.params.id), body)));
});

tasksRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await deleteTask(auth.userId, String(req.params.id))));
});

tasksRouter.patch("/:id/archive", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await archiveTask(auth.userId, String(req.params.id))));
});

tasksRouter.patch("/:id/unarchive", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await unarchiveTask(auth.userId, String(req.params.id))));
});

tasksRouter.patch("/:id/trash", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await trashTask(auth.userId, String(req.params.id))));
});

tasksRouter.patch("/:id/restore", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ destinationColumnId: z.string().uuid().optional() }).parse(req.body ?? {});
  res.json(ok(await restoreTrashedTask(auth.userId, String(req.params.id), body.destinationColumnId)));
});

tasksRouter.delete("/:id/permanent", async (req, res) => {
  const auth = getAuth(req);
  await permanentDeleteTask(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});

tasksRouter.patch("/:id/move", async (req, res) => {
  const auth = getAuth(req);
  const body = moveSchema.parse(req.body);
  res.json(ok(await moveTask(auth.userId, String(req.params.id), body)));
});

tasksRouter.post("/:id/labels", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ labelId: z.string().uuid() }).parse(req.body);
  res.json(ok(await addTaskLabel(auth.userId, String(req.params.id), body.labelId)));
});

tasksRouter.delete("/:id/labels/:labelId", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await removeTaskLabel(auth.userId, String(req.params.id), String(req.params.labelId))));
});

tasksRouter.get("/:id/checklist", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listChecklist(auth.userId, String(req.params.id))));
});

tasksRouter.post("/:id/checklist", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ text: z.string().min(1).max(300) }).parse(req.body);
  res.status(201).json(ok(await addChecklistItem(auth.userId, String(req.params.id), body.text)));
});

tasksRouter.get("/:id/comments", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listComments(auth.userId, String(req.params.id))));
});

tasksRouter.post("/:id/comments", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
  res.status(201).json(ok(await addComment(auth.userId, String(req.params.id), body.content)));
});

tasksRouter.get("/:id/activity", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listTaskActivity(auth.userId, String(req.params.id))));
});

tasksRouter.get("/:id/attachments", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listAttachments(auth.userId, String(req.params.id))));
});

tasksRouter.post("/:id/attachments", upload.single("file"), async (req, res) => {
  const auth = getAuth(req);
  if (!req.file) {
    res.status(400).json({ status: "error", error: { code: "NO_FILE", message: "File is required." } });
    return;
  }
  res.status(201).json(ok(await addAttachment(auth.userId, String(req.params.id), req.file)));
});
