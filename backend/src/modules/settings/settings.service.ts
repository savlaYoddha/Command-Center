import { eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { userSettings } from "../../database/schema/index.js";
import { nowMs } from "../../utils/ids.js";

export type AppearanceSettings = {
  theme: string;
  accentColor: string;
  animationIntensity: string;
  layoutDensity: string;
};

const defaults: AppearanceSettings = {
  theme: "dark",
  accentColor: "#00BFFF",
  animationIntensity: "subtle",
  layoutDensity: "standard",
};

function normalizeSettings(row: AppearanceSettings): AppearanceSettings {
  const animation =
    row.animationIntensity === "full"
      ? "cinematic"
      : row.animationIntensity === "off" ||
          row.animationIntensity === "subtle" ||
          row.animationIntensity === "standard" ||
          row.animationIntensity === "cinematic"
        ? row.animationIntensity
        : "subtle";
  const density =
    row.layoutDensity === "compact" || row.layoutDensity === "standard" || row.layoutDensity === "comfortable"
      ? row.layoutDensity
      : "standard";
  return { ...row, animationIntensity: animation, layoutDensity: density };
}

export async function ensureUserSettings(userId: string): Promise<AppearanceSettings> {
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (existing) {
    return normalizeSettings({
      theme: existing.theme,
      accentColor: existing.accentColor,
      animationIntensity: existing.animationIntensity,
      layoutDensity: existing.layoutDensity,
    });
  }

  await db.insert(userSettings).values({
    userId,
    ...defaults,
    updatedAt: nowMs(),
  });

  return defaults;
}

export async function getSettings(userId: string): Promise<AppearanceSettings> {
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (!existing) return defaults;
  return normalizeSettings({
    theme: existing.theme,
    accentColor: existing.accentColor,
    animationIntensity: existing.animationIntensity,
    layoutDensity: existing.layoutDensity,
  });
}

export async function updateSettings(
  userId: string,
  patch: Partial<AppearanceSettings>,
): Promise<AppearanceSettings> {
  const current = await getSettings(userId);
  const next = normalizeSettings({ ...current, ...patch });
  await db
    .insert(userSettings)
    .values({
      userId,
      ...next,
      updatedAt: nowMs(),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        theme: next.theme,
        accentColor: next.accentColor,
        animationIntensity: next.animationIntensity,
        layoutDensity: next.layoutDensity,
        updatedAt: nowMs(),
      },
    });
  return next;
}
