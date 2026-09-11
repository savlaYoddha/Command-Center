import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { fail } from "../utils/response.js";
import { authenticateApiKey, scopeAllowed } from "../modules/apikeys/apikeys.service.js";

export type AuthedRequest = Request & {
  userId: string;
  username: string;
  authMethod: "cookie" | "api_key";
  scopes: string[];
};

export function getAuth(req: Request): AuthedRequest {
  return req as unknown as AuthedRequest;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void authenticate(req, res, next);
}

async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    const api = await authenticateApiKey(token);
    if (api) {
      const authed = req as AuthedRequest;
      authed.userId = api.userId;
      authed.username = api.username;
      authed.authMethod = "api_key";
      authed.scopes = api.scopes;
      next();
      return;
    }
  }

  const cookie = req.cookies?.cc_access as string | undefined;
  if (!cookie) {
    res.status(401).json(fail("UNAUTHENTICATED", "Authentication required."));
    return;
  }
  try {
    const claims = verifyAccessToken(cookie);
    const authed = req as AuthedRequest;
    authed.userId = claims.sub;
    authed.username = claims.username;
    authed.authMethod = "cookie";
    authed.scopes = ["*"];
    next();
  } catch {
    res.status(401).json(fail("UNAUTHENTICATED", "Session expired."));
  }
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = getAuth(req);
    if (auth.authMethod === "cookie" || auth.scopes.includes("*")) {
      next();
      return;
    }
    if (!scopeAllowed(auth.scopes, scope)) {
      res.status(403).json(fail("FORBIDDEN", "This API key does not have the required scope."));
      return;
    }
    next();
  };
}
