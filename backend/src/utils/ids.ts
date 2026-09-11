import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

export function nowMs(): number {
  return Date.now();
}
