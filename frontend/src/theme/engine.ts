import { getBuiltinTheme } from "./presets";
import {
  DARK_TOKENS,
  LIGHT_TOKENS,
  readCustomThemes,
  readStoredActiveTheme,
  readStoredMode,
  readStoredTokens,
  resolvedMode,
  type ThemeMode,
  type ThemeTokenMap,
} from "./tokens";

export function resolveThemeBase(resolved: "dark" | "light", activeId = readStoredActiveTheme()): ThemeTokenMap {
  const custom = readCustomThemes().find((item) => item.id === activeId);
  if (custom) {
    const fallback = resolved === "light" ? LIGHT_TOKENS : DARK_TOKENS;
    return { ...fallback, ...custom.tokens };
  }
  const preset = getBuiltinTheme(activeId);
  return resolved === "light" ? preset.light : preset.dark;
}

export function applyTheme(
  mode: ThemeMode,
  overrides: ThemeTokenMap = readStoredTokens(),
  activeId: string = readStoredActiveTheme(),
): void {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolvedMode(mode, systemDark);
  const base = resolveThemeBase(resolved, activeId);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.dataset.activeTheme = activeId;
  for (const [key, value] of Object.entries(base)) {
    root.style.setProperty(key, overrides[key] ?? value);
  }
  root.style.setProperty("--cc-bg", "var(--bg-primary)");
  root.style.setProperty("--cc-bg-secondary", "var(--bg-secondary)");
  root.style.setProperty("--cc-panel", "var(--surface)");
  root.style.setProperty("--cc-border", "var(--border)");
  root.style.setProperty("--cc-accent", "var(--accent)");
  root.style.setProperty("--cc-accent-primary", "var(--accent)");
  root.style.setProperty("--cc-text", "var(--text-primary)");
  root.style.setProperty("--cc-text-muted", "var(--text-muted)");
  root.style.setProperty("--cc-success", "var(--success)");
  root.style.setProperty("--cc-warning", "var(--warning)");
  root.style.setProperty("--cc-danger", "var(--danger)");
}

export function reapplyStoredTheme(): void {
  applyTheme(readStoredMode());
}
