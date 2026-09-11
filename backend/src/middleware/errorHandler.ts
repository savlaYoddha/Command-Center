import type { NextFunction, Request, Response } from "express";
import { fail } from "../utils/response.js";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json(fail(err.code, err.message));
    return;
  }

  console.error("Unhandled error", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  res.status(500).json(fail("INTERNAL_ERROR", "Unable to complete request."));
}
