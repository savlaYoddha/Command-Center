import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import {
  createColumn,
  deleteColumn,
  listColumns,
  renameColumn,
  reorderColumns,
} from "./columns.service.js";

export const columnsRouter = Router();
columnsRouter.use(requireAuth);
columnsRouter.use((req, res, next) => {
  const scope = req.method === "GET" ? "tasks:read" : req.method === "DELETE" ? "tasks:manage" : "tasks:write";
  requireScope(scope)(req, res, next);
});

const nameSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
});
const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) });
const deleteSchema = z.object({ destinationColumnId: z.string().uuid().optional() });

columnsRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listColumns(auth.userId)));
});

columnsRouter.post("/", async (req, res) => {
  const auth = getAuth(req);
  const { name, description } = nameSchema.parse(req.body);
  res.status(201).json(ok(await createColumn(auth.userId, name, description)));
});

columnsRouter.patch("/reorder", async (req, res) => {
  const auth = getAuth(req);
  const { orderedIds } = reorderSchema.parse(req.body);
  res.json(ok(await reorderColumns(auth.userId, orderedIds)));
});

columnsRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const { name, description } = nameSchema.parse(req.body);
  res.json(ok(await renameColumn(auth.userId, String(req.params.id), name, description)));
});

columnsRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const { name, description } = nameSchema.parse(req.body);
  res.json(ok(await renameColumn(auth.userId, String(req.params.id), name, description)));
});

columnsRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = deleteSchema.parse(req.body ?? {});
  await deleteColumn(auth.userId, String(req.params.id), body.destinationColumnId);
  res.json(ok({ deleted: true }));
});
