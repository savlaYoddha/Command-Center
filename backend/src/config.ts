import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "..");
const projectRoot = path.resolve(here, "../..");

loadEnv({ path: path.join(backendRoot, ".env") });
loadEnv({ path: path.join(projectRoot, ".env") });
loadEnv();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(projectRoot, "data");

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  dataDir,
  databaseUrl: required("DATABASE_URL", "postgresql://commandcenter:commandcenter_dev_password@localhost:5432/commandcenter"),
  uploadsDir: path.join(dataDir, "uploads"),
  jwtSecret: required("JWT_SECRET", "dev-only-change-me-jwt-secret-32chars!!"),
  jwtRefreshSecret: required(
    "JWT_REFRESH_SECRET",
    "dev-only-change-me-refresh-secret-32",
  ),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
  initialAdminUsername: process.env.INITIAL_ADMIN_USERNAME ?? "admin",
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD ?? "change-me-now",
  appOrigin: process.env.APP_ORIGIN ?? "http://localhost:5173",
};

export const isProduction = config.nodeEnv === "production";
