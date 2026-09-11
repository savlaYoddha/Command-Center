import { HudLoading } from "./motion";

export function LoadingState({ label = "SYNCING COMMAND DATABASE..." }: { label?: string }) {
  return <HudLoading label={label} />;
}
