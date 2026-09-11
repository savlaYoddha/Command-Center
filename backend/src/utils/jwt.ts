import jwt from "jsonwebtoken";
import { config } from "../config.js";

const ACCESS_TTL = "15m";
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AccessClaims = {
  sub: string;
  username: string;
  typ: "access";
};

export type RefreshClaims = {
  sub: string;
  sid: string;
  typ: "refresh";
};

export function signAccessToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, username, typ: "access" } satisfies AccessClaims, config.jwtSecret, {
    expiresIn: ACCESS_TTL,
  });
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId, typ: "refresh" } satisfies RefreshClaims, config.jwtRefreshSecret, {
    expiresIn: REFRESH_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  const payload = jwt.verify(token, config.jwtSecret) as AccessClaims;
  if (payload.typ !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshClaims {
  const payload = jwt.verify(token, config.jwtRefreshSecret) as RefreshClaims;
  if (payload.typ !== "refresh") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export const refreshTtlMs = REFRESH_TTL_SECONDS * 1000;
