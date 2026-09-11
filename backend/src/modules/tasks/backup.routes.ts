import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import { exportTasks, restoreTasks } from "./backup.service.js";

export const backupRouter = Router();
backupRouter.use(requireAuth);

backupRouter.get("/tasks", requireScope("tasks:read"), async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await exportTasks(auth.userId, { source: "settings" })));
});

backupRouter.post("/tasks", requireScope("tasks:write"), async (req, res) => {
  const auth = getAuth(req);
  const body = z
    .object({
      mode: z.enum(["merge", "replace"]),
      backup: z.unknown(),
    })
    .parse(req.body);
  res.json(ok(await restoreTasks(auth.userId, body.backup, body.mode)));
});
