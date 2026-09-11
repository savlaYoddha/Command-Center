import { pgTable, text, bigint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("command"),
  accentColor: text("accent_color").notNull().default("#00BFFF"),
  animationIntensity: text("animation_intensity").notNull().default("subtle"),
  layoutDensity: text("layout_density").notNull().default("comfortable"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
