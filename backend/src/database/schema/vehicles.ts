import { pgTable, text, bigint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  kind: text("kind").notNull().default("car"),
  make: text("make").notNull().default(""),
  model: text("model").notNull().default(""),
  variant: text("variant").notNull().default(""),
  year: bigint("year", { mode: "number" }),

  registrationNumber: text("registration_number").notNull().default(""),
  vin: text("vin").notNull().default(""),
  engineNumber: text("engine_number").notNull().default(""),

  fuelType: text("fuel_type").notNull().default(""),
  transmission: text("transmission").notNull().default(""),
  color: text("color").notNull().default(""),

  loanId: text("loan_id"),
  frontTyre: text("front_tyre").notNull().default(""),
  rearTyre: text("rear_tyre").notNull().default(""),

  purchaseDate: text("purchase_date"),
  purchasePrice: bigint("purchase_price", { mode: "number" }),

  currentOdometer: bigint("current_odometer", { mode: "number" }).notNull().default(0),
  currentValue: bigint("current_value", { mode: "number" }),

  photo: text("photo").notNull().default(""),
  notes: text("notes").notNull().default(""),

  archived: bigint("archived", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
