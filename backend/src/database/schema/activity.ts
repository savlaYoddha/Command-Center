import { pgTable, text, bigint } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const activity = pgTable("activity", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
