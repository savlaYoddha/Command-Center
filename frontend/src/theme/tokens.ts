export const THEME_STORAGE_MODE = "cc.themeMode";
export const THEME_STORAGE_TOKENS = "cc.themeTokens";
export const THEME_STORAGE_ACTIVE = "cc.activeTheme";
export const THEME_STORAGE_CUSTOM = "cc.customThemes";

export type ThemeMode = "dark" | "light" | "system";

export type ThemeTokenMap = Record<string, string>;

export const TOKEN_GROUPS: Array<{ id: string; label: string; keys: Array<{ key: string; label: string }> }> = [
  {
    id: "base",
    label: "Base",
    keys: [
      { key: "--bg-primary", label: "Background" },
      { key: "--bg-secondary", label: "Surface / sidebar" },
      { key: "--surface", label: "Card / panel" },
      { key: "--surface-elevated", label: "Surface elevated" },
      { key: "--modal-bg", label: "Modal background" },
      { key: "--drawer-bg", label: "Drawer background" },
      { key: "--input-bg", label: "Input background" },
    ],
  },
  {
    id: "accent",
    label: "Accent",
    keys: [
      { key: "--accent", label: "Primary accent" },
      { key: "--accent-secondary", label: "Secondary accent" },
      { key: "--focus", label: "Focus" },
      { key: "--link", label: "Link" },
      { key: "--border", label: "Border" },
      { key: "--border-active", label: "Border active" },
    ],
  },
  {
    id: "status",
    label: "Status",
    keys: [
      { key: "--success", label: "Success" },
      { key: "--warning", label: "Warning" },
      { key: "--danger", label: "Danger" },
      { key: "--info", label: "Info" },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    keys: [
      { key: "--text-primary", label: "Primary text" },
      { key: "--text-secondary", label: "Secondary text" },
      { key: "--text-muted", label: "Muted text" },
      { key: "--icon", label: "Icons" },
    ],
  },
  {
    id: "priority",
    label: "Priority",
    keys: [
      { key: "--priority-low", label: "Low" },
      { key: "--priority-medium", label: "Medium" },
      { key: "--priority-high", label: "High" },
      { key: "--priority-urgent", label: "Urgent" },
    ],
  },
];

export const DARK_TOKENS: ThemeTokenMap = {
  "--bg-primary": "#05070a",
  "--bg-secondary": "#0a0f16",
  "--surface": "#0d141d",
  "--surface-elevated": "#121b26",
  "--modal-bg": "#0d141d",
  "--drawer-bg": "#0a0f16",
  "--input-bg": "#0a0f16",
  "--border": "#163247",
  "--border-active": "#00bfff",
  "--accent": "#00bfff",
  "--accent-secondary": "#7a5cff",
  "--success": "#00ff9d",
  "--warning": "#ffd700",
  "--danger": "#ff3864",
  "--info": "#00bfff",
  "--focus": "#00bfff",
  "--link": "#00bfff",
  "--text-primary": "#e6f7ff",
  "--text-secondary": "#a9c4d4",
  "--text-muted": "#7a93a3",
  "--icon": "#c5e4f5",
  "--priority-low": "#7a93a3",
  "--priority-medium": "#00bfff",
  "--priority-high": "#ffd700",
  "--priority-urgent": "#ff3864",
};

export const LIGHT_TOKENS: ThemeTokenMap = {
  "--bg-primary": "#d7e4ee",
  "--bg-secondary": "#c5d6e3",
  "--surface": "#eef5fa",
  "--surface-elevated": "#f7fbfe",
  "--modal-bg": "#eef5fa",
  "--drawer-bg": "#c5d6e3",
  "--input-bg": "#e4eef5",
  "--border": "#7a9bb0",
  "--border-active": "#0077a8",
  "--accent": "#0077a8",
  "--accent-secondary": "#5a3fd6",
  "--success": "#0a8a58",
  "--warning": "#b8860b",
  "--danger": "#c41e45",
  "--info": "#0077a8",
  "--focus": "#0077a8",
  "--link": "#0077a8",
  "--text-primary": "#0a1a28",
  "--text-secondary": "#2d4a5c",
  "--text-muted": "#4a6678",
  "--icon": "#0a1a28",
  "--priority-low": "#4a6678",
  "--priority-medium": "#0077a8",
  "--priority-high": "#b8860b",
  "--priority-urgent": "#c41e45",
};

export function resolvedMode(mode: ThemeMode, systemDark: boolean): "dark" | "light" {
  if (mode === "system") return systemDark ? "dark" : "light";
  return mode;
}

export function readStoredMode(): ThemeMode {
  const value = localStorage.getItem(THEME_STORAGE_MODE);
  if (value === "dark" || value === "light" || value === "system") return value;
  return "dark";
}

export function readStoredTokens(): ThemeTokenMap {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_TOKENS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ThemeTokenMap;
  } catch {
    return {};
  }
}

export type CustomTheme = {
  id: string;
  name: string;
  tokens: ThemeTokenMap;
  createdAt: number;
};

export function readStoredActiveTheme(): string {
  return localStorage.getItem(THEME_STORAGE_ACTIVE) ?? "command-default";
}

export function persistActiveTheme(id: string): void {
  localStorage.setItem(THEME_STORAGE_ACTIVE, id);
}

export function readCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_CUSTOM);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CustomTheme => {
      return Boolean(item && typeof item === "object" && typeof (item as CustomTheme).id === "string");
    });
  } catch {
    return [];
  }
}

export function persistCustomThemes(themes: CustomTheme[]): void {
  localStorage.setItem(THEME_STORAGE_CUSTOM, JSON.stringify(themes));
}

export function persistThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_MODE, mode);
}

export function persistThemeTokens(tokens: ThemeTokenMap): void {
  localStorage.setItem(THEME_STORAGE_TOKENS, JSON.stringify(tokens));
}

export function resetThemeTokens(): void {
  localStorage.removeItem(THEME_STORAGE_TOKENS);
}
