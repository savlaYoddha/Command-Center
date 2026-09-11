import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { listRecentActivity } from "./activity.service.js";
import { ok } from "../../utils/response.js";

export const activityRouter = Router();

activityRouter.get("/", requireAuth, async (req, res) => {
  const authReq = req as AuthedRequest;
  res.json(ok(await listRecentActivity(authReq.userId)));
});
