import { CommandPanel } from "@/components/hud/CommandPanel";
import { MetricCard } from "@/components/hud/MetricCard";
import { SectionHeader } from "@/components/hud/SectionHeader";

export function DashboardPage() {
  return (
    <div className="space-y-6 hud-stagger">
      <SectionHeader kicker="Analytics" title="System dashboard" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard value="0" label="Active tasks" />
        <MetricCard value="0" label="Open loans" />
        <MetricCard value="0" label="Vehicles" />
        <MetricCard value="0" label="Expiring docs" />
      </div>
      <CommandPanel className="p-6" hatch>
        <p className="text-sm text-text-secondary">
          Detailed analytics will aggregate live data from Tasks, Finance, Vehicles and Documents
          as those modules come online. Charts stay readable — no cockpit clutter.
        </p>
      </CommandPanel>
    </div>
  );
}
