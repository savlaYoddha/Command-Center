import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import { createLabel, deleteLabel, listLabels, updateLabel } from "./labels.service.js";

export const labelsRouter = Router();
labelsRouter.use(requireAuth);
labelsRouter.use((req, res, next) => {
  const scope = req.method === "GET" ? "tasks:read" : req.method === "DELETE" ? "tasks:write" : "tasks:write";
  requireScope(scope)(req, res, next);
});

const createSchema = z.object({
  name: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

const updateSchema = createSchema.partial();

labelsRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await listLabels(auth.userId)));
});

labelsRouter.post("/", async (req, res) => {
  const auth = getAuth(req);
  const body = createSchema.parse(req.body);
  res.status(201).json(ok(await createLabel(auth.userId, body.name, body.color)));
});

labelsRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateLabel(auth.userId, String(req.params.id), body)));
});

labelsRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateLabel(auth.userId, String(req.params.id), body)));
});

labelsRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteLabel(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});
