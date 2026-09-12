import { pgTable, text, bigint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folder: text("folder").notNull().default(""),
  category: text("category").notNull().default("other"),
  name: text("name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  tags: text("tags").$type<string[]>().notNull().default([]),
  notes: text("notes").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});