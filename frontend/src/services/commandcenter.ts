import { api } from "./api";

export type User = {
  id: string;
  username: string;
  displayName: string;
};

export type AppearanceSettings = {
  theme: string;
  accentColor: string;
  animationIntensity: "off" | "subtle" | "standard" | "cinematic" | "full" | string;
  layoutDensity: "compact" | "standard" | "comfortable" | string;
};

export type Overview = {
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  generatedAt: number;
  modules: Record<
    string,
    { primary: number; primaryLabel: string; secondary: number; secondaryLabel: string }
  >;
  system: { cpu: number; ram: number; storage: number; hostname: string; uptimeSeconds: number };
  alerts: Array<{ id: string; module: string; title: string; body: string; severity: string }>;
  upcoming: Array<{ id: string; module: string; title: string; dueLabel: string }>;
  activity: Array<{ id: string; module: string; action: string; summary: string; createdAt: number }>;
};

export const authService = {
  login: (username: string, password: string) =>
    api.post<{ user: User }>("/api/v1/auth/login", { username, password }),
  logout: () => api.post<{ loggedOut: boolean }>("/api/v1/auth/logout"),
  me: () => api.get<{ user: User; settings: AppearanceSettings }>("/api/v1/auth/me"),
  refresh: () => api.post<{ user: User }>("/api/v1/auth/refresh"),
  changePassword: (currentPassword: string, nextPassword: string) =>
    api.post<{ requiresLogin: boolean }>("/api/v1/auth/password", { currentPassword, nextPassword }),
};

export const overviewService = {
  get: () => api.get<Overview>("/api/v1/overview"),
};

export const settingsService = {
  get: () => api.get<AppearanceSettings>("/api/v1/settings"),
  update: (patch: Partial<AppearanceSettings>) => api.put<AppearanceSettings>("/api/v1/settings", patch),
};
