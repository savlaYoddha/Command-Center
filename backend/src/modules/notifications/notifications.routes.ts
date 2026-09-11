import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { db } from "../../database/index.js";
import { notifications } from "../../database/schema/index.js";
import { ok } from "../../utils/response.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const authReq = req as AuthedRequest;
  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, authReq.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  res.json(ok(items));
});
