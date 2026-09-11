import { db } from "../../database/index.js";
import { activity } from "../../database/schema/index.js";
import { createId, nowMs } from "../../utils/ids.js";
import { desc, eq } from "drizzle-orm";

export async function recordActivity(input: {
  userId: string;
  module: string;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(activity).values({
    id: createId(),
    userId: input.userId,
    module: input.module,
    action: input.action,
    summary: input.summary,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: nowMs(),
  });
}

export async function listRecentActivity(userId: string, limit = 12) {
  return db
    .select()
    .from(activity)
    .where(eq(activity.userId, userId))
    .orderBy(desc(activity.createdAt))
    .limit(limit);
}
