import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, getAuth, type AuthedRequest } from "../../middleware/auth.js";
import { ok } from "../../utils/response.js";
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  archiveVehicle,
  unarchiveVehicle,
  deleteVehicle,
  uploadVehiclePhoto,
  type VehicleKind,
} from "./vehicles.service.js";

export const vehiclesRouter = Router();
vehiclesRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const kindEnum = z.enum(["car", "motorcycle", "scooter", "other"]);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  kind: kindEnum.optional(),
  make: z.string().max(80).optional(),
  model: z.string().max(80).optional(),
  variant: z.string().max(80).optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  registrationNumber: z.string().max(30).optional(),
  vin: z.string().max(30).optional(),
  engineNumber: z.string().max(30).optional(),
  fuelType: z.string().max(30).optional(),
  transmission: z.string().max(30).optional(),
  color: z.string().max(30).optional(),
  loanId: z.string().max(80).nullable().optional(),
  frontTyre: z.string().max(30).optional(),
  rearTyre: z.string().max(30).optional(),
  purchaseDate: z.string().nullable().optional(),
  purchasePrice: z.number().nullable().optional(),
  currentOdometer: z.number().int().min(0).optional(),
  currentValue: z.number().nullable().optional(),
  notes: z.string().max(5000).optional(),
});

const updateSchema = createSchema.partial();

vehiclesRouter.get("/", async (req, res) => {
  const auth = getAuth(req);
  const archived = req.query.archived === "1" || req.query.archived === "true";
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  res.json(ok(await listVehicles(auth.userId, { archived, search })));
});

vehiclesRouter.post("/", async (req, res) => {
  const auth = getAuth(req);
  const body = createSchema.parse(req.body);
  res.status(201).json(ok(await createVehicle(auth.userId, body)));
});

vehiclesRouter.get("/:id", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await getVehicle(auth.userId, String(req.params.id))));
});

vehiclesRouter.put("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateVehicle(auth.userId, String(req.params.id), body)));
});

vehiclesRouter.patch("/:id", async (req, res) => {
  const auth = getAuth(req);
  const body = updateSchema.parse(req.body);
  res.json(ok(await updateVehicle(auth.userId, String(req.params.id), body)));
});

vehiclesRouter.delete("/:id", async (req, res) => {
  const auth = getAuth(req);
  await deleteVehicle(auth.userId, String(req.params.id));
  res.json(ok({ deleted: true }));
});

vehiclesRouter.patch("/:id/archive", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await archiveVehicle(auth.userId, String(req.params.id))));
});

vehiclesRouter.patch("/:id/unarchive", async (req, res) => {
  const auth = getAuth(req);
  res.json(ok(await unarchiveVehicle(auth.userId, String(req.params.id))));
});

vehiclesRouter.post("/:id/photo", upload.single("file"), async (req, res) => {
  const auth = getAuth(req);
  if (!req.file) {
    res.status(400).json({ status: "error", error: { code: "NO_FILE", message: "File is required." } });
    return;
  }
  res.json(ok(await uploadVehiclePhoto(auth.userId, String(req.params.id), req.file)));
});
