import { DARK_TOKENS, LIGHT_TOKENS, type ThemeTokenMap } from "./tokens";

export type BuiltinThemeId =
  | "command-default"
  | "tactical-cyan"
  | "amber-terminal"
  | "deep-space"
  | "stealth"
  | "high-contrast";

export type ThemePreset = {
  id: BuiltinThemeId;
  name: string;
  description: string;
  dark: ThemeTokenMap;
  light: ThemeTokenMap;
};

function tint(base: ThemeTokenMap, patch: ThemeTokenMap): ThemeTokenMap {
  return { ...base, ...patch };
}

export const BUILTIN_THEMES: ThemePreset[] = [
  {
    id: "command-default",
    name: "COMMAND DEFAULT",
    description: "Standard cyan HUD",
    dark: DARK_TOKENS,
    light: LIGHT_TOKENS,
  },
  {
    id: "tactical-cyan",
    name: "TACTICAL CYAN",
    description: "High-visibility ops cyan",
    dark: tint(DARK_TOKENS, {
      "--accent": "#00fff0",
      "--accent-secondary": "#5ce1ff",
      "--border": "#0d4a55",
      "--border-active": "#00fff0",
      "--focus": "#00fff0",
      "--link": "#00fff0",
      "--info": "#00fff0",
      "--priority-medium": "#00fff0",
    }),
    light: tint(LIGHT_TOKENS, {
      "--accent": "#008f86",
      "--accent-secondary": "#006f9a",
      "--border-active": "#008f86",
      "--focus": "#008f86",
      "--link": "#008f86",
      "--info": "#008f86",
      "--priority-medium": "#008f86",
    }),
  },
  {
    id: "amber-terminal",
    name: "AMBER TERMINAL",
    description: "Warm tactical phosphor",
    dark: tint(DARK_TOKENS, {
      "--bg-primary": "#0b0804",
      "--bg-secondary": "#140f08",
      "--surface": "#1a140a",
      "--surface-elevated": "#221a0d",
      "--modal-bg": "#1a140a",
      "--drawer-bg": "#140f08",
      "--input-bg": "#140f08",
      "--border": "#4a3514",
      "--border-active": "#ffb000",
      "--accent": "#ffb000",
      "--accent-secondary": "#ff6b2d",
      "--focus": "#ffb000",
      "--link": "#ffb000",
      "--info": "#ffb000",
      "--text-primary": "#ffe8c2",
      "--text-secondary": "#c9a66b",
      "--text-muted": "#8f7344",
      "--icon": "#ffd27a",
      "--priority-medium": "#ffb000",
    }),
    light: tint(LIGHT_TOKENS, {
      "--bg-primary": "#efe4d0",
      "--bg-secondary": "#e4d4b6",
      "--surface": "#f7f0e2",
      "--accent": "#9a6a00",
      "--border": "#b08940",
      "--border-active": "#9a6a00",
      "--focus": "#9a6a00",
      "--link": "#9a6a00",
      "--info": "#9a6a00",
      "--priority-medium": "#9a6a00",
    }),
  },
  {
    id: "deep-space",
    name: "DEEP SPACE",
    description: "Violet long-range HUD",
    dark: tint(DARK_TOKENS, {
      "--bg-primary": "#05040c",
      "--bg-secondary": "#0b0918",
      "--surface": "#110e22",
      "--surface-elevated": "#181430",
      "--modal-bg": "#110e22",
      "--drawer-bg": "#0b0918",
      "--input-bg": "#0b0918",
      "--border": "#2d2458",
      "--border-active": "#8b7cff",
      "--accent": "#8b7cff",
      "--accent-secondary": "#00c8ff",
      "--focus": "#8b7cff",
      "--link": "#9d92ff",
      "--info": "#8b7cff",
      "--priority-medium": "#8b7cff",
    }),
    light: tint(LIGHT_TOKENS, {
      "--accent": "#4f3fd0",
      "--accent-secondary": "#2a6aa8",
      "--border-active": "#4f3fd0",
      "--focus": "#4f3fd0",
      "--link": "#4f3fd0",
      "--info": "#4f3fd0",
      "--priority-medium": "#4f3fd0",
    }),
  },
  {
    id: "stealth",
    name: "STEALTH",
    description: "Low-emission night ops",
    dark: tint(DARK_TOKENS, {
      "--bg-primary": "#030405",
      "--bg-secondary": "#07090c",
      "--surface": "#0b0e12",
      "--surface-elevated": "#10151b",
      "--modal-bg": "#0b0e12",
      "--drawer-bg": "#07090c",
      "--input-bg": "#07090c",
      "--border": "#1c2a33",
      "--border-active": "#3d8a9a",
      "--accent": "#3d8a9a",
      "--accent-secondary": "#4a6678",
      "--focus": "#3d8a9a",
      "--link": "#5aa8b8",
      "--info": "#3d8a9a",
      "--text-primary": "#c5d4dc",
      "--text-secondary": "#7e93a0",
      "--text-muted": "#5c6f7a",
      "--icon": "#9eb3bd",
      "--priority-medium": "#3d8a9a",
    }),
    light: tint(LIGHT_TOKENS, {
      "--accent": "#2d5c68",
      "--border-active": "#2d5c68",
      "--focus": "#2d5c68",
      "--link": "#2d5c68",
      "--info": "#2d5c68",
      "--priority-medium": "#2d5c68",
    }),
  },
  {
    id: "high-contrast",
    name: "HIGH CONTRAST",
    description: "Maximum readout contrast",
    dark: tint(DARK_TOKENS, {
      "--bg-primary": "#000000",
      "--bg-secondary": "#0a0a0a",
      "--surface": "#111111",
      "--surface-elevated": "#1a1a1a",
      "--modal-bg": "#111111",
      "--drawer-bg": "#0a0a0a",
      "--input-bg": "#0a0a0a",
      "--border": "#ffffff",
      "--border-active": "#00ffff",
      "--accent": "#00ffff",
      "--accent-secondary": "#ffff00",
      "--focus": "#00ffff",
      "--link": "#00ffff",
      "--info": "#00ffff",
      "--text-primary": "#ffffff",
      "--text-secondary": "#e8e8e8",
      "--text-muted": "#c0c0c0",
      "--icon": "#ffffff",
      "--success": "#00ff00",
      "--warning": "#ffff00",
      "--danger": "#ff3333",
      "--priority-medium": "#00ffff",
    }),
    light: tint(LIGHT_TOKENS, {
      "--bg-primary": "#ffffff",
      "--bg-secondary": "#f0f0f0",
      "--surface": "#ffffff",
      "--border": "#000000",
      "--border-active": "#0000aa",
      "--accent": "#0000aa",
      "--text-primary": "#000000",
      "--text-secondary": "#111111",
      "--text-muted": "#222222",
      "--icon": "#000000",
      "--focus": "#0000aa",
      "--link": "#0000aa",
    }),
  },
];

export function getBuiltinTheme(id: string): ThemePreset {
  return BUILTIN_THEMES.find((item) => item.id === id) ?? BUILTIN_THEMES[0];
}

export function isBuiltinThemeId(id: string): id is BuiltinThemeId {
  return BUILTIN_THEMES.some((item) => item.id === id);
}
