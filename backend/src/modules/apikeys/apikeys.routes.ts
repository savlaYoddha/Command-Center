import { Router } from "express";
import { z } from "zod";
import { requireAuth, getAuth } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import { createApiKey, listApiKeys, regenerateApiKey, revokeApiKey } from "./apikeys.service.js";

export const apiKeysRouter = Router();
apiKeysRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(["tasks:read", "tasks:write", "tasks:delete", "tasks:manage"])).min(1),
});

apiKeysRouter.get("/", async (req, res) => {
  res.json(ok(await listApiKeys(getAuth(req).userId)));
});

apiKeysRouter.post("/", async (req, res) => {
  const body = createSchema.parse(req.body);
  const created = await createApiKey(getAuth(req).userId, body.name, body.scopes);
  res.status(201).json(
    ok({
      id: created.id,
      name: created.name,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
      key: created.key,
    }),
  );
});

apiKeysRouter.post("/:id/regenerate", async (req, res) => {
  res.json(ok(await regenerateApiKey(getAuth(req).userId, String(req.params.id))));
});

apiKeysRouter.delete("/:id", async (req, res) => {
  await revokeApiKey(getAuth(req).userId, String(req.params.id));
  res.json(ok({ revoked: true }));
});
