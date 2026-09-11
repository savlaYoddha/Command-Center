import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { sessions, users } from "../../database/schema/index.js";
import { config } from "../../config.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { createId, nowMs } from "../../utils/ids.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { refreshTtlMs, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { ensureUserSettings } from "../settings/settings.service.js";
import { recordActivity } from "../activity/activity.service.js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function bootstrapAdmin(): Promise<void> {
  const existing = await db.select().from(users);
  if (existing.length > 0) return;

  const now = nowMs();
  const userId = createId();
  await db.insert(users).values({
    id: userId,
    username: config.initialAdminUsername,
    passwordHash: await hashPassword(config.initialAdminPassword),
    displayName: "Operator",
    createdAt: now,
    updatedAt: now,
  });

  await ensureUserSettings(userId);
  await recordActivity({
    userId,
    module: "system",
    action: "BOOTSTRAP",
    summary: "COMMANDCENTER initialized",
  });
}

export async function login(input: {
  username: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const [user] = await db.select().from(users).where(eq(users.username, input.username));
  if (!user) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
  }

  const sessionId = createId();
  const refreshToken = signRefreshToken(user.id, sessionId);
  const now = nowMs();

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: now + refreshTtlMs,
    createdAt: now,
    userAgent: input.userAgent ?? null,
    ipAddress: input.ipAddress ?? null,
  });

  await recordActivity({
    userId: user.id,
    module: "auth",
    action: "LOGIN",
    summary: "Operator authenticated",
  });

  return {
    accessToken: signAccessToken(user.id, user.username),
    refreshToken,
    user: publicUser(user),
  };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    const claims = verifyRefreshToken(refreshToken);
    await db.delete(sessions).where(eq(sessions.id, claims.sid));
  } catch {
    // Ignore invalid refresh tokens on logout.
  }
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) {
    throw new HttpError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "UNAUTHENTICATED", "Session expired.");
  }

  const [session] = await db.select().from(sessions).where(eq(sessions.id, claims.sid));
  if (!session || session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new HttpError(401, "UNAUTHENTICATED", "Session expired.");
  }
  if (session.expiresAt < nowMs()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw new HttpError(401, "UNAUTHENTICATED", "Session expired.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Session expired.");
  }

  return {
    accessToken: signAccessToken(user.id, user.username),
    user: publicUser(user),
  };
}

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found.");
  }
  return publicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "User not found.");
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new HttpError(400, "INVALID_PASSWORD", "Current password is incorrect.");
  }
  if (nextPassword.length < 10) {
    throw new HttpError(400, "WEAK_PASSWORD", "Password must be at least 10 characters.");
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(nextPassword), updatedAt: nowMs() })
    .where(eq(users.id, userId));

  await db.delete(sessions).where(eq(sessions.userId, userId));

  await recordActivity({
    userId,
    module: "auth",
    action: "PASSWORD_CHANGED",
    summary: "Security credentials updated",
  });
}

export function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}
