import { Router } from "express";
import multer from "multer";
import { createRequire } from "node:module";
import type { Archiver } from "archiver";

const require = createRequire(import.meta.url);
const archiver = require("archiver") as (format: string, options?: { zlib?: { level?: number } }) => Archiver;
import { z } from "zod";
import { requireAuth, getAuth, requireScope } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import {
  createDocument,
  deleteDocument,
  emailDocuments,
  getDocument,
  listDocuments,
  updateDocument,
  zipDocuments,
} from "./documents.service.js";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);
documentsRouter.use((req, res, next) => {
  requireScope(req.method === "GET" ? "documents:read" : "documents:write")(req, res, next);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const VIEWABLE_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);

function transmit(res: import("express").Response, filePath: string, name: string, mimeType: string, inline: boolean) {
  const encoded = encodeURIComponent(name.replace(/[\\/]+/g, "-"));
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", inline ? "inline" : `attachment; filename*=UTF-8''${encoded}`);
  res.sendFile(filePath);
}

documentsRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  const folder =
    req.query.folder === undefined ? undefined : typeof req.query.folder === "string" ? req.query.folder : "";
  const category =
    req.query.category === undefined ? undefined : typeof req.query.category === "string" ? req.query.category : undefined;
  const tag = typeof req.query.tag === "string" && req.query.tag ? req.query.tag : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  res.json(ok(await listDocuments(auth.userId, { folder, category, tag, q })));
});

documentsRouter.get("/:id/file", async (req, res) => {
  const auth = getAuth(req);
  const { row, filePath } = await getDocument(auth.userId, String(req.params.id));
  transmit(res, filePath, row.name, row.mimeType, VIEWABLE_MIME.has(row.mimeType));
});

documentsRouter.get("/:id/download", async (req, res) => {
  const auth = getAuth(req);
  const { row, filePath } = await getDocument(auth.userId, String(req.params.id));
  transmit(res, filePath, row.name, row.mimeType, false);
});

documentsRouter.post(
  "/",
  upload.single("file"),
  async (req, res) => {
    const auth = getAuth(req);
    if (!req.file) {
      res.status(400).json({ status: "error", error: { code: "NO_FILE", message: "File is required." } });
      return;
    }
    const fields = z
      .object({
        folder: z.string().max(120).optional(),
        category: z.string().max(40).optional(),
        name: z.string().max(200).optional(),
        tags: z.string().max(2000).optional(),
        notes: z.string().max(5000).optional(),
      })
      .parse({
        folder: typeof req.body.folder === "string" ? req.body.folder : undefined,
        category: typeof req.body.category === "string" ? req.body.category : undefined,
        name: typeof req.body.name === "string" ? req.body.name : undefined,
        tags: typeof req.body.tags === "string" ? req.body.tags : undefined,
        notes: typeof req.body.notes === "string" ? req.body.notes : undefined,
      });
    const tags = fields.tags
      ? fields.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    res.status(201).json(
      ok(
        await createDocument(auth.userId, req.file, {
          folder: fields.folder,
          category: fields.category,
          name: fields.name,
          tags,
          notes: fields.notes,
        }),
      ),
    );
  },
);

documentsRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = z
    .object({
      folder: z.string().max(120).optional(),
      category: z.string().max(40).optional(),
      name: z.string().max(200).optional(),
      tags: z.array(z.string().max(30)).max(30).optional(),
      notes: z.string().max(5000).nullable().optional(),
    })
    .parse(req.body);
  res.json(
    ok(
      await updateDocument(auth.userId, String(req.params.id), {
        folder: body.folder,
        category: body.category,
        name: body.name,
        tags: body.tags,
        notes: body.notes ?? undefined,
      }),
    ),
  );
});

documentsRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await deleteDocument(auth.userId, String(req.params.id))));
});

documentsRouter.post("/zip", async (req, res) => {
  const auth = getAuth(req);
  const body = z.object({ ids: z.array(z.string().min(1)).min(1).max(200) }).parse(req.body);
  const { files, timestamp } = await zipDocuments(auth.userId, body.ids);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent("documents.zip")}`);
  const archive = archiver("zip", { zlib: { level: 8 } });
  archive.on("warning", (err) => {
    if (err.code !== "ENOENT") console.error("zip warning:", err);
  });
  archive.on("error", (err: Error) => {
    console.error("zip error:", err);
    res.destroy(err);
  });
  archive.pipe(res);
  for (const file of files) {
    archive.file(file.filePath, { name: file.name });
  }
  void timestamp;
  await archive.finalize();
});

documentsRouter.post("/email", async (req, res) => {
  const auth = getAuth(req);
  const body = z
    .object({
      ids: z.array(z.string().min(1)).min(1).max(200),
      to: z.string().email(),
      subject: z.string().max(200).optional(),
      body: z.string().max(5000).optional(),
    })
    .parse(req.body);
  res.json(ok(await emailDocuments(auth.userId, body.ids, { to: body.to, subject: body.subject, body: body.body })));
});