import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { getSettings, updateSettings } from "./settings.service.js";
import { ok } from "../../utils/response.js";

export const settingsRouter = Router();

const patchSchema = z.object({
  theme: z.enum(["command", "dark", "light", "system"]).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  animationIntensity: z.enum(["off", "subtle", "standard", "cinematic", "full"]).optional(),
  layoutDensity: z.enum(["compact", "standard", "comfortable"]).optional(),
});

settingsRouter.get("/", requireAuth, async (req, res) => {
  const authReq = req as AuthedRequest;
  res.json(ok(await getSettings(authReq.userId)));
});

settingsRouter.put("/", requireAuth, async (req, res) => {
  const authReq = req as AuthedRequest;
  const patch = patchSchema.parse(req.body);
  res.json(ok(await updateSettings(authReq.userId, patch)));
});
