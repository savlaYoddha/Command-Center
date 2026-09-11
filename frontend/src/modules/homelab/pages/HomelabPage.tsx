import { EmptyState } from "@/components/hud/EmptyState";

export function HomelabPage() {
  return (
    <EmptyState
      kicker="Infrastructure"
      title="Homelab telemetry standby"
      body="Container and host metrics will plug into this module without changing the rest of COMMANDCENTER."
    />
  );
}
