import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ListChecks,
  Landmark,
  Car,
  FileStack,
  Settings,
  Hexagon,
} from "lucide-react";

export type ModuleDefinition = {
  id: string;
  name: string;
  path: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  nav: boolean;
};

export const modules: ModuleDefinition[] = [
  {
    id: "command",
    name: "COMMAND",
    path: "/",
    subtitle: "Home overview",
    icon: Hexagon,
    accent: "var(--accent)",
    nav: false,
  },
  {
    id: "dashboard",
    name: "DASHBOARD",
    path: "/dashboard",
    subtitle: "Analytics overlay",
    icon: LayoutDashboard,
    accent: "var(--accent)",
    nav: true,
  },
  {
    id: "tasks",
    name: "TASKS",
    path: "/tasks",
    subtitle: "Global kanban",
    icon: ListChecks,
    accent: "var(--accent)",
    nav: true,
  },
  {
    id: "finance",
    name: "FINANCE",
    path: "/finance",
    subtitle: "Accounts and EMIs",
    icon: Landmark,
    accent: "var(--accent-secondary)",
    nav: true,
  },
  {
    id: "vehicles",
    name: "VEHICLES",
    path: "/vehicles",
    subtitle: "Fleet systems",
    icon: Car,
    accent: "var(--accent)",
    nav: true,
  },
  {
    id: "documents",
    name: "DOCUMENTS",
    path: "/documents",
    subtitle: "Archive and expiry",
    icon: FileStack,
    accent: "var(--accent-secondary)",
    nav: true,
  },
  {
    id: "settings",
    name: "SETTINGS",
    path: "/settings",
    subtitle: "Operator controls",
    icon: Settings,
    accent: "var(--text-secondary)",
    nav: true,
  },
];

export const navModules = modules.filter((m) => m.nav && m.id !== "settings");
export const settingsModule = modules.find((m) => m.id === "settings")!;
