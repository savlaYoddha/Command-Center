import { useEffect, useState } from "react";
import { ModuleTile } from "@/components/hud/ModuleTile";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { SectionHeader } from "@/components/hud/SectionHeader";
import { ActivityItem } from "@/components/hud/ActivityItem";
import { MetricCard } from "@/components/hud/MetricCard";
import { StatusIndicator } from "@/components/hud/StatusIndicator";
import { LoadingState } from "@/components/hud/LoadingState";
import { EmptyState } from "@/components/hud/EmptyState";
import { modules } from "@/modules/registry";
import { overviewService, type Overview } from "@/services/commandcenter";

function formatDate(date: Date) {
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "long" }),
    rest: date.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function CommandHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = formatDate(new Date());

  useEffect(() => {
    overviewService
      .get()
      .then(setOverview)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load overview."));
  }, []);

  if (error) {
    return (
      <EmptyState
        kicker="System error"
        title="Unable to load command overview"
        body={error}
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!overview) return <LoadingState label="LOADING COMMAND OVERVIEW..." />;

  const tileOrder = ["tasks", "finance", "vehicles", "documents", "dashboard"];
  const tileModules = tileOrder
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is (typeof modules)[number] => Boolean(m));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-display text-[10px] tracking-[0.32em] text-[color:var(--accent)] uppercase">
            Command overview
          </div>
          <h1 className="mt-1 font-display text-2xl tracking-[0.12em] uppercase">
            COMMAND<span className="text-[color:var(--accent)]">CENTER</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {now.weekday} · {now.rest} · {now.time}
          </p>
        </div>
        <StatusIndicator />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard value={`${overview.system.cpu}%`} label="CPU" />
        <MetricCard value={`${overview.system.ram}%`} label="RAM" />
        <MetricCard value={`${overview.system.storage}%`} label="STORAGE" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tileModules.map((mod) => {
          const metrics = overview.modules[mod.id] ?? {
            primary: 0,
            primaryLabel: "ONLINE",
            secondary: 0,
            secondaryLabel: "STANDBY",
          };
          return (
            <ModuleTile
              key={mod.id}
              name={mod.name}
              path={mod.path}
              icon={mod.icon}
              primary={metrics.primary}
              primaryLabel={metrics.primaryLabel}
              secondary={metrics.secondary}
              secondaryLabel={metrics.secondaryLabel}
            />
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CommandPanel className="p-5" hatch>
          <SectionHeader kicker="Queue" title="Today" />
          {overview.upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary">No scheduled items. Task database comes online in Phase 2.</p>
          ) : (
            overview.upcoming.map((item) => (
              <div key={item.id} className="border-b border-[color:var(--border)] py-3 last:border-0">
                <div className="font-display text-[10px] text-[color:var(--accent)]">{item.module}</div>
                <div>{item.title}</div>
                <div className="text-xs text-text-muted">{item.dueLabel}</div>
              </div>
            ))
          )}
        </CommandPanel>
        <CommandPanel className="p-5" hatch>
          <SectionHeader kicker="Telemetry" title="Recent activity" />
          {overview.activity.length === 0 ? (
            <p className="text-sm text-text-secondary">No activity recorded yet.</p>
          ) : (
            overview.activity.map((item) => (
              <ActivityItem key={item.id} summary={item.summary} module={item.module} createdAt={item.createdAt} />
            ))
          )}
        </CommandPanel>
      </div>
    </div>
  );
}
