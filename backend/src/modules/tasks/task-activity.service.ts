import { desc, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { activity } from "../../database/schema/index.js";
import { getTask } from "./tasks.service.js";

export async function listTaskActivity(userId: string, taskId: string) {
  await getTask(userId, taskId);
  return db
    .select()
    .from(activity)
    .where(eq(activity.entityId, taskId))
    .orderBy(desc(activity.createdAt));
}
