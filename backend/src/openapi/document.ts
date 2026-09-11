export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "COMMANDCENTER API",
    version: "0.3.0",
    description:
      "Authenticated HTTP API for COMMANDCENTER. Cookie sessions (`cc_access`) or API keys (`Authorization: Bearer cc_live_...`).\n\nEndpoints marked with a lock require authentication — the **Authorize** button accepts either a `cc_access` cookie value or an API key.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "cc_access", description: "Session cookie set by POST /auth/login" },
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "API Key", description: "API key: cc_live_..." },
    },
  },
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Session login, refresh, logout and password" },
    { name: "Dashboard", description: "Unified command overview" },
    { name: "Health", description: "Liveness / readiness" },
    { name: "Settings", description: "Per-user preferences" },
    { name: "Activity", description: "Command activity feed" },
    { name: "Notifications", description: "User notifications" },
    { name: "Tasks", description: "Task lifecycle & metadata" },
    { name: "Columns", description: "Kanban board columns" },
    { name: "Labels", description: "Task labels" },
    { name: "Checklist", description: "Task checklist items" },
    { name: "Comments", description: "Task comments" },
    { name: "Attachments", description: "Task file attachments" },
    { name: "Saved Filters", description: "Reusable task filters" },
    { name: "Backups", description: "JSON export / restore" },
    { name: "API Keys", description: "Programmatic access keys" },
    { name: "Vehicles", description: "Fleet vehicle register" },
  ],
  paths: {
    // ── Auth ────────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        security: [],
        summary: "Login and set httpOnly cookies",
        description: "Sets `cc_access` and `cc_refresh` cookies. Public.",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["username", "password"], properties: { username: { type: "string", example: "admin" }, password: { type: "string", example: "change-me-now" } } },
            },
          },
        },
      },
    },
    "/auth/refresh": {
      post: { tags: ["Auth"], security: [], summary: "Refresh access token using cc_refresh cookie" },
    },
    "/auth/logout": {
      post: { tags: ["Auth"], security: [], summary: "Clear session cookies" },
    },
    "/auth/me": {
      get: { tags: ["Auth"], summary: "Get current user profile", security: [{ cookieAuth: [] }] },
    },
    "/auth/password": {
      post: {
        tags: ["Auth"],
        summary: "Change own password",
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8 } } },
            },
          },
        },
      },
    },
    // ── Dashboard ───────────────────────────────────────────
    "/overview": {
      get: { tags: ["Dashboard"], summary: "Command overview metrics & recent activity" },
    },
    // ── Health ──────────────────────────────────────────────
    "/health": {
      get: { tags: ["Health"], security: [], summary: "Liveness check (unauthenticated)", operationId: "healthCheck" },
    },
    // ── Settings ────────────────────────────────────────────
    "/settings": {
      get: { tags: ["Settings"], summary: "Get current user settings" },
      put: {
        tags: ["Settings"],
        summary: "Update settings (partial)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  theme: { type: "string", enum: ["command", "dark", "light", "system"] },
                  accentColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", example: "#00ff9f" },
                  animationIntensity: { type: "string", enum: ["off", "subtle", "standard", "cinematic", "full"] },
                  layoutDensity: { type: "string", enum: ["compact", "standard", "comfortable"] },
                },
              },
            },
          },
        },
      },
    },
    // ── Activity ────────────────────────────────────────────
    "/activity": {
      get: { tags: ["Activity"], summary: "Recent activity feed", description: "Query: `?limit=50`" },
    },
    // ── Notifications ───────────────────────────────────────
    "/notifications": {
      get: { tags: ["Notifications"], summary: "List notifications", description: "Query: `?unread=true`" },
    },
    // ── Tasks ───────────────────────────────────────────────
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks",
        description: "Filters: `search`, `labelIds`, `labelMode`, `priority`, `columnId`, `due`, `status`. Scope: tasks:read",
      },
      post: {
        tags: ["Tasks"],
        summary: "Create task",
        description: 'Example: `{ "title": "Renew insurance next Monday", "columnId": "<uuid>", "dueDate": "2026-08-31", "labelIds": [] }`',
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, columnId: { type: "string", format: "uuid" }, priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, dueDate: { type: "string", format: "date" }, labelIds: { type: "array", items: { type: "string" } } } },
            },
          },
        },
      },
    },
    "/tasks/{id}": {
      get: { tags: ["Tasks"], summary: "Get task by UUID or TASK-001", description: "Scope: tasks:read" },
      patch: { tags: ["Tasks"], summary: "Update task fields", description: "Scope: tasks:write" },
      put: { tags: ["Tasks"], summary: "Update task fields (alias of PATCH)" },
      delete: { tags: ["Tasks"], summary: "Delete task", description: "Scope: tasks:delete" },
    },
    "/tasks/{id}/move": {
      patch: {
        tags: ["Tasks"],
        summary: "Move or reorder a task",
        description: 'Body: `{ "columnId", "position", "orderedIds" }`. Example: move TASK-001 to In Progress.',
      },
    },
    "/tasks/{id}/archive": { patch: { tags: ["Tasks"], summary: "Archive a task" } },
    "/tasks/{id}/unarchive": { patch: { tags: ["Tasks"], summary: "Unarchive a task" } },
    "/tasks/{id}/trash": { patch: { tags: ["Tasks"], summary: "Move task to trash" } },
    "/tasks/{id}/restore": { patch: { tags: ["Tasks"], summary: "Restore task from trash" } },
    "/tasks/{id}/permanent": { delete: { tags: ["Tasks"], summary: "Permanently delete task" } },
    "/tasks/{id}/labels": {
      post: { tags: ["Tasks"], summary: "Assign labels", requestBody: { content: { "application/json": { schema: { type: "object", required: ["labelIds"], properties: { labelIds: { type: "array", items: { type: "string" } } } } } } } },
    },
    "/tasks/{id}/labels/{labelId}": { delete: { tags: ["Tasks"], summary: "Remove one label from task" } },
    "/tasks/{id}/checklist": {
      get: { tags: ["Checklist"], summary: "List checklist items for task" },
      post: { tags: ["Checklist"], summary: "Add checklist item", description: 'Body: `{ "text": "Buy insulation tape" }`' },
    },
    "/tasks/{id}/comments": {
      get: { tags: ["Comments"], summary: "List comments for task" },
      post: { tags: ["Comments"], summary: "Add comment", description: 'Body: `{ "body": "..." }`' },
    },
    "/tasks/{id}/activity": { get: { tags: ["Activity"], summary: "Task-scoped activity" } },
    "/tasks/{id}/attachments": {
      get: { tags: ["Attachments"], summary: "List attachments for task" },
      post: { tags: ["Attachments"], summary: "Upload attachment", description: "multipart/form-data, field `file`", requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } } },
    },
    // ── Columns ─────────────────────────────────────────────
    "/columns": {
      get: { tags: ["Columns"], summary: "List columns (board order preserved)" },
      post: { tags: ["Columns"], summary: "Create column", description: 'Body: `{ "name": "Backlog" }`' },
    },
    "/columns/reorder": { patch: { tags: ["Columns"], summary: "Reorder columns", description: "Body: ordered column ids array" } },
    "/columns/{id}": {
      put: { tags: ["Columns"], summary: "Rename column (alias of PATCH)" },
      patch: { tags: ["Columns"], summary: "Rename column" },
      delete: { tags: ["Columns"], summary: "Delete column; `destinationColumnId` required if it has tasks" },
    },
    // ── Labels ──────────────────────────────────────────────
    "/labels": {
      get: { tags: ["Labels"], summary: "List labels" },
      post: { tags: ["Labels"], summary: "Create label", description: 'Body: `{ "name": "Home", "color": "#ff6347" }`' },
    },
    "/labels/{id}": {
      put: { tags: ["Labels"], summary: "Update label (alias of PATCH)" },
      patch: { tags: ["Labels"], summary: "Update label" },
      delete: { tags: ["Labels"], summary: "Delete label (does not delete tasks)" },
    },
    // ── Checklist / Comments / Attachments / Saved Filters (sub-paths) ──
    "/checklist/{id}": {
      patch: { tags: ["Checklist"], summary: "Update checklist item (toggle done / edit text)" },
      delete: { tags: ["Checklist"], summary: "Delete checklist item" },
    },
    "/comments/{id}": {
      put: { tags: ["Comments"], summary: "Edit comment body" },
      delete: { tags: ["Comments"], summary: "Delete comment" },
    },
    "/attachments/{id}": {
      get: { tags: ["Attachments"], summary: "Download attachment file" },
      delete: { tags: ["Attachments"], summary: "Delete attachment" },
    },
    "/saved-filters": {
      get: { tags: ["Saved Filters"], summary: "List saved filters" },
      post: { tags: ["Saved Filters"], summary: "Create saved filter" },
    },
    "/saved-filters/{id}": {
      put: { tags: ["Saved Filters"], summary: "Update saved filter" },
      delete: { tags: ["Saved Filters"], summary: "Delete saved filter" },
    },
    // ── Backups ─────────────────────────────────────────────
    "/backups/tasks": {
      get: { tags: ["Backups"], summary: "Export tasks JSON backup" },
      post: {
        tags: ["Backups"],
        summary: "Restore tasks backup",
        description: 'Body: `{ "mode": "merge" | "replace", "backup": { ... } }`',
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["mode", "backup"], properties: { mode: { type: "string", enum: ["merge", "replace"] }, backup: { type: "object" } } },
            },
          },
        },
      },
    },
    // ── API Keys ────────────────────────────────────────────
    "/api-keys": {
      get: { tags: ["API Keys"], summary: "List API keys (masked)" },
      post: {
        tags: ["API Keys"],
        summary: "Create API key (full key returned once)",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "scopes"],
                properties: {
                  name: { type: "string", maxLength: 80 },
                  scopes: { type: "array", minItems: 1, items: { type: "string", enum: ["tasks:read", "tasks:write", "tasks:delete", "tasks:manage"] } },
                },
              },
            },
          },
        },
      },
    },
    "/api-keys/{id}/regenerate": { post: { tags: ["API Keys"], summary: "Regenerate key (returns new full key once)" } },
    "/api-keys/{id}": { delete: { tags: ["API Keys"], summary: "Revoke API key" } },
    // ── Vehicles ────────────────────────────────────────────
    "/vehicles": {
      get: {
        tags: ["Vehicles"],
        summary: "List vehicles",
        description: "Query: `?archived=1` for archived, `?search=` for text search.",
      },
      post: {
        tags: ["Vehicles"],
        summary: "Create vehicle",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Honda City" },
                  kind: { type: "string", enum: ["car", "motorcycle", "scooter", "other"] },
                  make: { type: "string" },
                  model: { type: "string" },
                  variant: { type: "string" },
                  year: { type: "number" },
                  registrationNumber: { type: "string" },
                  vin: { type: "string" },
                  engineNumber: { type: "string" },
                  fuelType: { type: "string" },
                  transmission: { type: "string" },
                  color: { type: "string" },
                  purchaseDate: { type: "string", format: "date" },
                  purchasePrice: { type: "number" },
                  currentOdometer: { type: "number" },
                  currentValue: { type: "number" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    "/vehicles/{id}": {
      get: { tags: ["Vehicles"], summary: "Get vehicle by ID" },
      put: { tags: ["Vehicles"], summary: "Update vehicle fields" },
      patch: { tags: ["Vehicles"], summary: "Update vehicle fields (alias of PUT)" },
      delete: { tags: ["Vehicles"], summary: "Delete vehicle permanently" },
    },
    "/vehicles/{id}/archive": { patch: { tags: ["Vehicles"], summary: "Archive a vehicle" } },
    "/vehicles/{id}/unarchive": { patch: { tags: ["Vehicles"], summary: "Restore a vehicle from archive" } },
    "/vehicles/{id}/photo": {
      post: {
        tags: ["Vehicles"],
        summary: "Upload vehicle photo",
        description: "multipart/form-data, field `file`. PNG, JPEG or WebP, max 10MB.",
        requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
      },
    },
    // ── Spec ────────────────────────────────────────────────
    "/openapi.json": { get: { tags: ["Auth"], security: [], summary: "This specification (raw JSON)" } },
  },
} as const;
