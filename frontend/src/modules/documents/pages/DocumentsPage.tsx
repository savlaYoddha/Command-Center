import { EmptyState } from "@/components/hud/EmptyState";

export function DocumentsPage() {
  return (
    <EmptyState
      kicker="Archive"
      title="Document store empty"
      body="Upload, expiry tracking and cross-module links will be added after Tasks is operational."
    />
  );
}
