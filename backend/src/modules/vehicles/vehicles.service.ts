import fs from "node:fs";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import { vehicles } from "../../database/schema/index.js";
import { config } from "../../config.js";
import { createId, nowMs } from "../../utils/ids.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordActivity } from "../activity/activity.service.js";

export type VehicleKind = "car" | "motorcycle" | "scooter" | "other";

export type VehicleInput = {
  name: string;
  kind?: VehicleKind;
  make?: string;
  model?: string;
  variant?: string;
  year?: number | null;
  registrationNumber?: string;
  vin?: string;
  engineNumber?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  loanId?: string | null;
  frontTyre?: string;
  rearTyre?: string;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  currentOdometer?: number;
  currentValue?: number | null;
  notes?: string;
};

export type VehicleUpdate = Partial<VehicleInput>;

function assertVehicleOwner(userId: string, vehicle: (typeof vehicles.$inferSelect) | undefined) {
  if (!vehicle || vehicle.userId !== userId) {
    throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  }
}

export async function listVehicles(userId: string, opts?: { archived?: boolean; search?: string }) {
  const rows = await db.select().from(vehicles).where(eq(vehicles.userId, userId));
  let filtered = rows.filter((v) => (opts?.archived ? v.archived === 1 : v.archived === 0));
  if (opts?.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    filtered = filtered.filter((v) => {
      const haystack = [v.name, v.make, v.model, v.variant, v.registrationNumber, v.vin, v.color]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  return filtered.map((v) => ({
    id: v.id,
    name: v.name,
    kind: v.kind,
    make: v.make,
    model: v.model,
    variant: v.variant,
    year: v.year,
    registrationNumber: v.registrationNumber,
    vin: v.vin,
    engineNumber: v.engineNumber,
    fuelType: v.fuelType,
    transmission: v.transmission,
    color: v.color,
    loanId: v.loanId,
    frontTyre: v.frontTyre,
    rearTyre: v.rearTyre,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    currentOdometer: v.currentOdometer,
    currentValue: v.currentValue,
    photo: v.photo,
    notes: v.notes,
    archived: v.archived,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
}

export async function getVehicle(userId: string, vehicleId: string) {
  const [row] = await db.select().from(vehicles).where(and(eq(vehicles.id, vehicleId), eq(vehicles.userId, userId)));
  assertVehicleOwner(userId, row);
  return {
    id: row!.id,
    name: row!.name,
    kind: row!.kind,
    make: row!.make,
    model: row!.model,
    variant: row!.variant,
    year: row!.year,
    registrationNumber: row!.registrationNumber,
    vin: row!.vin,
    engineNumber: row!.engineNumber,
    fuelType: row!.fuelType,
    transmission: row!.transmission,
    color: row!.color,
    loanId: row!.loanId,
    frontTyre: row!.frontTyre,
    rearTyre: row!.rearTyre,
    purchaseDate: row!.purchaseDate,
    purchasePrice: row!.purchasePrice,
    currentOdometer: row!.currentOdometer,
    currentValue: row!.currentValue,
    photo: row!.photo,
    notes: row!.notes,
    archived: row!.archived,
    createdAt: row!.createdAt,
    updatedAt: row!.updatedAt,
  };
}

export async function createVehicle(userId: string, input: VehicleInput) {
  const name = input.name.trim();
  if (!name) throw new HttpError(400, "INVALID_NAME", "Vehicle name is required.");
  const now = nowMs();
  const vehicle = {
    id: createId(),
    userId,
    name,
    kind: input.kind ?? "car",
    make: input.make ?? "",
    model: input.model ?? "",
    variant: input.variant ?? "",
    year: input.year ?? null,
    registrationNumber: input.registrationNumber ?? "",
    vin: input.vin ?? "",
    engineNumber: input.engineNumber ?? "",
    fuelType: input.fuelType ?? "",
    transmission: input.transmission ?? "",
    color: input.color ?? "",
    loanId: input.loanId ?? null,
    frontTyre: input.frontTyre ?? "",
    rearTyre: input.rearTyre ?? "",
    purchaseDate: input.purchaseDate ?? null,
    purchasePrice: input.purchasePrice ?? null,
    currentOdometer: input.currentOdometer ?? 0,
    currentValue: input.currentValue ?? null,
    photo: "",
    notes: input.notes ?? "",
    archived: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(vehicles).values(vehicle);
  await recordActivity({
    userId,
    module: "vehicles",
    action: "VEHICLE_CREATED",
    entityType: "vehicle",
    entityId: vehicle.id,
    summary: `${vehicle.name} added to fleet`,
  });
  return getVehicle(userId, vehicle.id);
}

export async function updateVehicle(userId: string, vehicleId: string, patch: VehicleUpdate) {
  const current = await getVehicle(userId, vehicleId);
  const updates: Record<string, unknown> = { updatedAt: nowMs() };
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new HttpError(400, "INVALID_NAME", "Vehicle name is required.");
    updates.name = name;
  }
  if (patch.kind !== undefined) updates.kind = patch.kind;
  if (patch.make !== undefined) updates.make = patch.make;
  if (patch.model !== undefined) updates.model = patch.model;
  if (patch.variant !== undefined) updates.variant = patch.variant;
  if (patch.year !== undefined) updates.year = patch.year;
  if (patch.registrationNumber !== undefined) updates.registrationNumber = patch.registrationNumber;
  if (patch.vin !== undefined) updates.vin = patch.vin;
  if (patch.engineNumber !== undefined) updates.engineNumber = patch.engineNumber;
  if (patch.fuelType !== undefined) updates.fuelType = patch.fuelType;
  if (patch.transmission !== undefined) updates.transmission = patch.transmission;
  if (patch.color !== undefined) updates.color = patch.color;
  if (patch.loanId !== undefined) updates.loanId = patch.loanId;
  if (patch.frontTyre !== undefined) updates.frontTyre = patch.frontTyre;
  if (patch.rearTyre !== undefined) updates.rearTyre = patch.rearTyre;
  if (patch.purchaseDate !== undefined) updates.purchaseDate = patch.purchaseDate;
  if (patch.purchasePrice !== undefined) updates.purchasePrice = patch.purchasePrice;
  if (patch.currentOdometer !== undefined) updates.currentOdometer = patch.currentOdometer;
  if (patch.currentValue !== undefined) updates.currentValue = patch.currentValue;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  await db.update(vehicles).set(updates).where(eq(vehicles.id, vehicleId));
  await recordActivity({
    userId,
    module: "vehicles",
    action: "VEHICLE_UPDATED",
    entityType: "vehicle",
    entityId: vehicleId,
    summary: `${current.name} updated`,
  });
  return getVehicle(userId, vehicleId);
}

export async function archiveVehicle(userId: string, vehicleId: string) {
  const current = await getVehicle(userId, vehicleId);
  await db
    .update(vehicles)
    .set({ archived: 1, updatedAt: nowMs() })
    .where(eq(vehicles.id, vehicleId));
  await recordActivity({
    userId,
    module: "vehicles",
    action: "VEHICLE_ARCHIVED",
    entityType: "vehicle",
    entityId: vehicleId,
    summary: `${current.name} archived`,
  });
  return getVehicle(userId, vehicleId);
}

export async function unarchiveVehicle(userId: string, vehicleId: string) {
  const current = await getVehicle(userId, vehicleId);
  await db
    .update(vehicles)
    .set({ archived: 0, updatedAt: nowMs() })
    .where(eq(vehicles.id, vehicleId));
  await recordActivity({
    userId,
    module: "vehicles",
    action: "VEHICLE_UNARCHIVED",
    entityType: "vehicle",
    entityId: vehicleId,
    summary: `${current.name} restored from archive`,
  });
  return getVehicle(userId, vehicleId);
}

export async function deleteVehicle(userId: string, vehicleId: string) {
  const current = await getVehicle(userId, vehicleId);
  const dir = path.join(config.uploadsDir, "vehicles", vehicleId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
  await recordActivity({
    userId,
    module: "vehicles",
    action: "VEHICLE_DELETED",
    entityType: "vehicle",
    entityId: vehicleId,
    summary: `${current.name} permanently deleted`,
  });
}

export async function uploadVehiclePhoto(
  userId: string,
  vehicleId: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
) {
  await getVehicle(userId, vehicleId);
  const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new HttpError(400, "UNSUPPORTED_FILE", "Only PNG, JPEG and WebP images are allowed.");
  }
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const storedName = `photo${ext}`;
  const dir = path.join(config.uploadsDir, "vehicles", vehicleId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, storedName), file.buffer);
  const photoPath = `/uploads/vehicles/${vehicleId}/${storedName}`;
  await db
    .update(vehicles)
    .set({ photo: photoPath, updatedAt: nowMs() })
    .where(eq(vehicles.id, vehicleId));
  return { photo: photoPath };
}

export async function vehicleStats(userId: string) {
  const all = await db.select().from(vehicles).where(eq(vehicles.userId, userId));
  const active = all.filter((v) => v.archived === 0).length;
  const archived = all.filter((v) => v.archived === 1).length;
  return { active, archived, total: all.length };
}
