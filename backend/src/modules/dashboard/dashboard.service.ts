import { listRecentActivity } from "../activity/activity.service.js";
import { getSystemMetrics } from "../../utils/metrics.js";
import { taskStats } from "../tasks/tasks.service.js";
import { vehicleStats } from "../vehicles/vehicles.service.js";

export async function getCommandOverview(userId: string) {
  const activityItems = await listRecentActivity(userId, 8);
  const system = getSystemMetrics();
  const tasks = await taskStats(userId);
  const vehicles = await vehicleStats(userId);

  return {
    status: "ONLINE" as const,
    generatedAt: Date.now(),
    modules: {
      tasks: {
        primary: tasks.active,
        primaryLabel: "ACTIVE TASKS",
        secondary: tasks.dueToday,
        secondaryLabel: "DUE TODAY",
      },
      finance: { primary: 0, primaryLabel: "ACTIVE LOANS", secondary: 0, secondaryLabel: "PAYMENTS DUE" },
      vehicles: {
        primary: vehicles.active,
        primaryLabel: "VEHICLES",
        secondary: vehicles.archived,
        secondaryLabel: "ARCHIVED",
      },
      documents: { primary: 0, primaryLabel: "DOCUMENTS", secondary: 0, secondaryLabel: "EXPIRING" },
      homelab: { primary: 0, primaryLabel: "SERVICES", secondary: 0, secondaryLabel: "ONLINE" },
      dashboard: {
        primary: system.cpu,
        primaryLabel: "CPU",
        secondary: system.ram,
        secondaryLabel: "RAM",
      },
    },
    system,
    alerts: [] as Array<{ id: string; module: string; title: string; body: string; severity: string }>,
    upcoming: tasks.upcoming,
    activity: activityItems.map((item) => ({
      id: item.id,
      module: item.module,
      action: item.action,
      summary: item.summary,
      createdAt: item.createdAt,
    })),
  };
}
