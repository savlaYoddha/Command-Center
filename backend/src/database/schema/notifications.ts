import { pgTable, text, bigint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  severity: text("severity").notNull().default("info"),
  readAt: bigint("read_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
