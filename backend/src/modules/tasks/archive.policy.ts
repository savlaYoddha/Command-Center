const parsed = Number(process.env.CC_DONE_ARCHIVE_MS);
export const DONE_ARCHIVE_AFTER_MS =
  Number.isFinite(parsed) && parsed > 0 ? parsed : 7 * 24 * 60 * 60 * 1000;

export function isDoneColumnName(name: string): boolean {
  return name.trim().toLowerCase() === "done";
}

export function shouldArchiveDone(completedAt: number | null | undefined, now: number, afterMs = DONE_ARCHIVE_AFTER_MS): boolean {
  if (!completedAt) return false;
  return now - completedAt >= afterMs;
}
