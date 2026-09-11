import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { getCommandOverview } from "./dashboard.service.js";
import { ok } from "../../utils/response.js";

export const dashboardRouter = Router();

dashboardRouter.get("/overview", requireAuth, async (req, res) => {
  const authReq = req as AuthedRequest;
  res.json(ok(await getCommandOverview(authReq.userId)));
});
