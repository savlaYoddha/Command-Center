import type { AppearanceSettings } from "@/services/commandcenter";
import {
  persistActiveTheme,
  persistCustomThemes,
  persistThemeMode,
  persistThemeTokens,
  readCustomThemes,
  readStoredActiveTheme,
  readStoredMode,
  readStoredTokens,
  type CustomTheme,
  type ThemeMode,
  type ThemeTokenMap,
} from "./tokens";
import { applyTheme } from "./engine";
import { isBuiltinThemeId } from "./presets";
import { applyMotionSettings, normalizeAnimation, normalizeDensity } from "@/motion/tokens";

export const PREFERENCES_SCHEMA_VERSION = 2;

export type PreferencesExport = {
  schemaVersion: number;
  application: "COMMANDCENTER";
  exportedAt: string;
  preferences: {
    themeMode: ThemeMode;
    activeTheme: string;
    customThemes: CustomTheme[];
    colors: ThemeTokenMap;
    animation: { intensity: string };
    layout: { density: string };
    savedFilters?: Array<{ name: string; payloadJson: string }>;
  };
};

export function collectPreferences(settings: AppearanceSettings | null, savedFilters?: Array<{ name: string; payloadJson: string }>): PreferencesExport {
  return {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    application: "COMMANDCENTER",
    exportedAt: new Date().toISOString(),
    preferences: {
      themeMode: readStoredMode(),
      activeTheme: readStoredActiveTheme(),
      customThemes: readCustomThemes(),
      colors: readStoredTokens(),
      animation: { intensity: settings?.animationIntensity ?? document.documentElement.dataset.anim ?? "subtle" },
      layout: { density: settings?.layoutDensity ?? document.documentElement.dataset.density ?? "comfortable" },
      savedFilters,
    },
  };
}

export function validatePreferences(payload: unknown): PreferencesExport {
  if (!payload || typeof payload !== "object") {
    throw new Error("Preferences file is not valid JSON.");
  }
  const file = payload as PreferencesExport;
  if (file.application !== "COMMANDCENTER") {
    throw new Error("File is not a COMMANDCENTER preferences export.");
  }
  if (file.schemaVersion !== PREFERENCES_SCHEMA_VERSION) {
    throw new Error(`Incompatible preferences schema (expected ${PREFERENCES_SCHEMA_VERSION}).`);
  }
  if (!file.preferences || typeof file.preferences !== "object") {
    throw new Error("Preferences payload is missing.");
  }
  const mode = file.preferences.themeMode;
  if (mode !== "dark" && mode !== "light" && mode !== "system") {
    throw new Error("Invalid theme mode.");
  }
  if (typeof file.preferences.activeTheme !== "string") {
    throw new Error("Invalid active theme.");
  }
  if (!Array.isArray(file.preferences.customThemes)) {
    throw new Error("Invalid custom theme list.");
  }
  return file;
}

export function applyPreferencesImport(file: PreferencesExport): { themeMode: ThemeMode; animation: string; layout: string } {
  persistThemeMode(file.preferences.themeMode);
  persistActiveTheme(file.preferences.activeTheme);
  persistCustomThemes(file.preferences.customThemes);
  persistThemeTokens(file.preferences.colors ?? {});
  applyTheme(file.preferences.themeMode, file.preferences.colors ?? {}, file.preferences.activeTheme);
  applyMotionSettings(file.preferences.animation?.intensity, file.preferences.layout?.density);
  return {
    themeMode: file.preferences.themeMode,
    animation: normalizeAnimation(file.preferences.animation?.intensity),
    layout: normalizeDensity(file.preferences.layout?.density),
  };
}

export function assertActiveThemeExists(id: string): boolean {
  return isBuiltinThemeId(id) || readCustomThemes().some((item) => item.id === id);
}
