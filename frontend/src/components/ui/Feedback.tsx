import { HudButton } from "@/components/hud/HudButton";

type ErrorStateProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ title = "SYSTEM ERROR", message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div className="flex min-h-[24vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="font-display text-[10px] tracking-[0.3em] text-[color:var(--danger)] uppercase">{title}</div>
        <h2 className="mt-3 font-display text-lg tracking-[0.16em] uppercase">Operation failed</h2>
        <p className="mt-3 text-sm text-text-secondary">{message}</p>
        {actionLabel && onAction ? (
          <div className="mt-6">
            <HudButton variant="danger" onClick={onAction}>
              {actionLabel}
            </HudButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
