import type { Request, Response } from "express";
import { z } from "zod";
import { config } from "../../config.js";
import { requireAuth, type AuthedRequest } from "../../middleware/auth.js";
import { changePassword, getUserById, login, logout, refresh } from "./auth.service.js";
import { getSettings } from "../settings/settings.service.js";
import { ok } from "../../utils/response.js";

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  nextPassword: z.string().min(10).max(256),
});

function setAuthCookies(res: Response, accessToken: string, refreshToken?: string): void {
  res.cookie("cc_access", accessToken, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  if (refreshToken) {
    res.cookie("cc_refresh", refreshToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}

function clearAuthCookies(res: Response): void {
  res.clearCookie("cc_access", { path: "/" });
  res.clearCookie("cc_refresh", { path: "/api/v1/auth" });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const result = await login({
    username: body.username,
    password: body.password,
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip,
  });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json(ok({ user: result.user }));
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  await logout(req.cookies?.cc_refresh as string | undefined);
  clearAuthCookies(res);
  res.json(ok({ loggedOut: true }));
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const result = await refresh(req.cookies?.cc_refresh as string | undefined);
  setAuthCookies(res, result.accessToken);
  res.json(ok({ user: result.user }));
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthedRequest;
  const user = await getUserById(authReq.userId);
  const settings = await getSettings(authReq.userId);
  res.json(ok({ user, settings }));
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthedRequest;
  const body = passwordSchema.parse(req.body);
  await changePassword(authReq.userId, body.currentPassword, body.nextPassword);
  clearAuthCookies(res);
  res.json(ok({ requiresLogin: true }));
}

export { requireAuth };
