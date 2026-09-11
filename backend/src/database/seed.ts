#!/usr/bin/env tsx
/**
 * COMMANDCENTER — Database Seed Script
 *
 * Seeds the PostgreSQL database with demo data for development.
 * Safe to run multiple times (skips if data already exists).
 *
 * Usage:
 *   npx tsx src/database/seed.ts
 *   DATABASE_URL=postgresql://... npx tsx src/database/seed.ts
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../../..");
loadEnv({ path: path.join(projectRoot, ".env") });
loadEnv();

import { eq } from "drizzle-orm";
import { db, getPool } from "./index.js";
import {
  users,
  userSettings,
  boardColumns,
  labels,
  tasks,
  taskLabels,
  checklistItems,
  comments,
  activity,
  notifications,
} from "./schema/index.js";
import { hashPassword } from "../utils/password.js";
import { createId, nowMs } from "../utils/ids.js";

const SEED_USER = "admin";
const SEED_PASSWORD = "admin";

const demoColumns = [
  { name: "Backlog", position: 0 },
  { name: "In Progress", position: 1 },
  { name: "Review", position: 2 },
  { name: "Done", position: 3 },
];

const demoLabels = [
  { name: "Bug", color: "#EF4444" },
  { name: "Feature", color: "#3B82F6" },
  { name: "Improvement", color: "#10B981" },
  { name: "Urgent", color: "#F59E0B" },
  { name: "Documentation", color: "#8B5CF6" },
];

async function seed() {
  console.log("Seeding COMMANDCENTER database...");

  const pool = getPool();

  // Wait for DB connection
  try {
    await pool.query("SELECT 1");
    console.log("  ✓ PostgreSQL connection OK");
  } catch (err) {
    console.error("  ✗ Cannot connect to PostgreSQL:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Check if already seeded ──────────────────────────────────
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("  ℹ Database already has data. Skipping seed.");
    await pool.end();
    return;
  }

  const now = nowMs();
  const userId = createId();

  // ── Seed user ────────────────────────────────────────────────
  console.log("  Creating admin user...");
  await db.insert(users).values({
    id: userId,
    username: SEED_USER,
    passwordHash: await hashPassword(SEED_PASSWORD),
    displayName: "Command Operator",
    createdAt: now,
    updatedAt: now,
  });

  // ── User settings ────────────────────────────────────────────
  await db.insert(userSettings).values({
    userId,
    theme: "command",
    accentColor: "#00BFFF",
    animationIntensity: "subtle",
    layoutDensity: "comfortable",
    updatedAt: now,
  });

  // ── Board columns ────────────────────────────────────────────
  console.log("  Creating board columns...");
  const columnIds: string[] = [];
  for (const col of demoColumns) {
    const colId = createId();
    columnIds.push(colId);
    await db.insert(boardColumns).values({
      id: colId,
      userId,
      name: col.name,
      description: "",
      position: col.position,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ── Labels ───────────────────────────────────────────────────
  console.log("  Creating labels...");
  const labelIds: string[] = [];
  for (const lbl of demoLabels) {
    const lblId = createId();
    labelIds.push(lblId);
    await db.insert(labels).values({
      id: lblId,
      userId,
      name: lbl.name,
      color: lbl.color,
      createdAt: now,
    });
  }

  // ── Demo tasks ───────────────────────────────────────────────
  console.log("  Creating demo tasks...");
  const demoTasks = [
    { title: "Set up PostgreSQL database", description: "Verify PostgreSQL connection and schema are configured correctly", priority: "high", col: 1, labelIdx: [1, 2] },
    { title: "Review database schema", description: "Verify all tables and constraints are correct", priority: "medium", col: 2, labelIdx: [2] },
    { title: "Write seed scripts", description: "Create database seeding for development", priority: "medium", col: 0, labelIdx: [2] },
    { title: "Update Docker Compose", description: "Add PostgreSQL service to docker-compose.yml", priority: "high", col: 1, labelIdx: [1] },
    { title: "Test backup and restore", description: "Verify pg_dump/pg_restore workflow works", priority: "low", col: 0, labelIdx: [3] },
    { title: "Document API endpoints", description: "Update OpenAPI spec for all endpoints", priority: "low", col: 0, labelIdx: [4] },
  ];

  for (let i = 0; i < demoTasks.length; i++) {
    const dt = demoTasks[i];
    const taskId = createId();
    await db.insert(tasks).values({
      id: taskId,
      userId,
      columnId: columnIds[dt.col],
      number: i + 1,
      title: dt.title,
      description: dt.description,
      priority: dt.priority,
      position: i,
      archived: 0,
      createdAt: now - (demoTasks.length - i) * 86400000, // stagger dates
      updatedAt: now,
    });

    // Attach labels
    for (const li of dt.labelIdx) {
      await db.insert(taskLabels).values({ taskId, labelId: labelIds[li] });
    }

    // Add a checklist item to first task
    if (i === 0) {
      await db.insert(checklistItems).values({
        id: createId(),
        taskId,
        text: "Update drizzle.config.ts",
        completed: 1,
        position: 0,
        createdAt: now,
      });
      await db.insert(checklistItems).values({
        id: createId(),
        taskId,
        text: "Rewrite database connection layer",
        completed: 0,
        position: 1,
        createdAt: now,
      });
      await db.insert(comments).values({
        id: createId(),
        taskId,
        userId,
        content: "This is the priority migration task. PostgreSQL migration is critical for production deployment.",
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // ── Activity ─────────────────────────────────────────────────
  console.log("  Seeding activity log...");
  const activities = [
    { module: "system", action: "BOOTSTRAP", summary: "COMMANDCENTER initialized with PostgreSQL" },
    { module: "tasks", action: "CREATED", summary: "Created 6 demo tasks" },
    { module: "tasks", action: "COLUMN_CREATED", summary: "Created 4 board columns" },
    { module: "auth", action: "LOGIN", summary: "Admin user seeded" },
  ];

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    await db.insert(activity).values({
      id: createId(),
      userId,
      module: a.module,
      action: a.action,
      summary: a.summary,
      createdAt: now - (activities.length - i) * 60000,
    });
  }

  // ── Notifications ────────────────────────────────────────────
  console.log("  Seeding notifications...");
  await db.insert(notifications).values({
    id: createId(),
    userId,
    module: "system",
    title: "Welcome to COMMANDCENTER",
    body: "PostgreSQL migration complete. The system is now backed by PostgreSQL.",
    severity: "info",
    createdAt: now,
  });

  console.log("\n✓ Seed complete!");
  console.log(`  Admin login: ${SEED_USER} / ${SEED_PASSWORD}`);
  console.log(`  Tasks: ${demoTasks.length}`);
  console.log(`  Columns: ${demoColumns.length}`);
  console.log(`  Labels: ${demoLabels.length}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
