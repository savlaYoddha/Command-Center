import { create } from "zustand";
import { applyMotionSettings } from "@/motion/tokens";
import { applyTheme } from "@/theme/engine";
import { type ThemeMode } from "@/theme/tokens";
import { authService, type AppearanceSettings, type User } from "@/services/commandcenter";

type AuthState = {
  user: User | null;
  settings: AppearanceSettings | null;
  ready: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSettings: (settings: AppearanceSettings) => void;
};

function applyAppearance(settings: AppearanceSettings | null) {
  if (!settings) return;
  const root = document.documentElement;
  applyMotionSettings(settings.animationIntensity, settings.layoutDensity);
  const stored = localStorage.getItem("cc.themeMode");
  const fromSettings = settings.theme as ThemeMode | "command";
  const mode: ThemeMode =
    stored === "dark" || stored === "light" || stored === "system"
      ? stored
      : fromSettings === "light" || fromSettings === "system" || fromSettings === "dark"
        ? fromSettings
        : "dark";
  applyTheme(mode);
  const customAccent = localStorage.getItem("cc.themeTokens");
  if (settings.accentColor && !customAccent) {
    root.style.setProperty("--accent", settings.accentColor);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  settings: null,
  ready: false,
  error: null,
  bootstrap: async () => {
    try {
      const data = await authService.me();
      applyAppearance(data.settings);
      set({ user: data.user, settings: data.settings, ready: true, error: null });
    } catch {
      try {
        const refreshed = await authService.refresh();
        const data = await authService.me();
        applyAppearance(data.settings);
        set({ user: refreshed.user, settings: data.settings, ready: true, error: null });
      } catch {
        set({ user: null, settings: null, ready: true });
      }
    }
  },
  login: async (username, password) => {
    const data = await authService.login(username, password);
    const me = await authService.me();
    applyAppearance(me.settings);
    set({ user: data.user, settings: me.settings, error: null });
  },
  logout: async () => {
    await authService.logout();
    set({ user: null, settings: null });
  },
  setSettings: (settings) => {
    applyAppearance(settings);
    set({ settings });
  },
}));
