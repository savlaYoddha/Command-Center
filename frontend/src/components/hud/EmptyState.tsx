import { HudButton } from "./HudButton";

type Props = {
  kicker: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: "primary" | "ghost" | "danger";
};

export function EmptyState({ kicker, title, body, actionLabel, onAction, actionVariant }: Props) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="font-display text-[10px] tracking-[0.3em] text-[color:var(--accent)] uppercase">
          {kicker}
        </div>
        <h2 className="mt-3 font-display text-lg tracking-[0.16em] uppercase">{title}</h2>
        <p className="mt-3 text-sm text-text-secondary">{body}</p>
        {actionLabel && onAction ? (
          <div className="mt-6">
            <HudButton variant={actionVariant} onClick={onAction}>{actionLabel}</HudButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
