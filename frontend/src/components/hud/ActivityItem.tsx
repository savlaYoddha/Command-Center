type Props = {
  summary: string;
  module: string;
  createdAt: number;
};

export function ActivityItem({ summary, module, createdAt }: Props) {
  const time = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] py-3 last:border-0">
      <div>
        <div className="text-sm text-text-primary">{summary}</div>
        <div className="mt-1 font-display text-[9px] tracking-[0.2em] text-text-muted uppercase">{module}</div>
      </div>
      <div className="font-display text-[10px] text-text-secondary">{time}</div>
    </div>
  );
}
