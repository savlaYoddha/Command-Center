import path from "node:path";
import fs from "node:fs";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ZodError } from "zod";
import { config } from "./config.js";
import { runMigrations } from "./database/migrate.js";
import { bootstrapAdmin } from "./modules/auth/auth.service.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { settingsRouter } from "./modules/settings/settings.routes.js";
import { activityRouter } from "./modules/activity/activity.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { columnsRouter } from "./modules/tasks/columns.routes.js";
import { labelsRouter } from "./modules/tasks/labels.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";
import { backupRouter } from "./modules/tasks/backup.routes.js";
import { apiKeysRouter } from "./modules/apikeys/apikeys.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";
import { openApiDocument } from "./openapi/document.js";
import swaggerUi from "swagger-ui-express";
import {
  attachmentsRouter,
  checklistRouter,
  commentsRouter,
  savedFiltersRouter,
} from "./modules/tasks/extras.routes.js";
import { errorHandler, HttpError } from "./middleware/errorHandler.js";
import { fail } from "./utils/response.js";

await runMigrations();
await bootstrapAdmin();

const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origin === config.appOrigin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/api/v1/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

// Swagger UI — interactive API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "COMMANDCENTER API — Swagger UI",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  }),
);

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", dashboardRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/activity", activityRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/columns", columnsRouter);
app.use("/api/v1/labels", labelsRouter);
app.use("/api/v1/backups", backupRouter);
app.use("/api/v1/api-keys", apiKeysRouter);
app.use("/api/v1/tasks", tasksRouter);
app.use("/api/v1/checklist", checklistRouter);
app.use("/api/v1/comments", commentsRouter);
app.use("/api/v1/attachments", attachmentsRouter);
app.use("/api/v1/saved-filters", savedFiltersRouter);
app.use("/api/v1/vehicles", vehiclesRouter);

app.use("/uploads", express.static(config.uploadsDir));

app.use("/api", (_req, res) => {
  res.status(404).json(fail("NOT_FOUND", "Unknown endpoint."));
});

const frontendDistCandidates = [
  path.resolve(process.cwd(), "../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
];
const frontendDist = frontendDistCandidates.find((candidate) => fs.existsSync(candidate));
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json(fail("VALIDATION_ERROR", "Invalid request.", err.flatten()));
    return;
  }
  if (err instanceof HttpError) {
    errorHandler(err, req, res, next);
    return;
  }
  errorHandler(err, req, res, next);
});

app.listen(config.port, () => {
  console.log(`COMMANDCENTER listening on ${config.port}`);
});
