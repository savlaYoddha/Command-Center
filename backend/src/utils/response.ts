export function ok<T>(data: T) {
  return { status: "ok" as const, data };
}

export function fail(code: string, message: string, details?: unknown) {
  return { status: "error" as const, error: { code, message, details } };
}
