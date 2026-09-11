import { Router } from "express";
import os from "node:os";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "commandcenter",
    uptime: Math.round(os.uptime()),
  });
});
