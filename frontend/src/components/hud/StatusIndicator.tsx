type Props = {
  label?: string;
  status?: "online" | "warn" | "offline";
};

export function StatusIndicator({ label = "SYSTEM ONLINE", status = "online" }: Props) {
  const color =
    status === "online" ? "var(--success)" : status === "warn" ? "var(--warning)" : "var(--danger)";
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {label ? (
        <span className="font-display text-[10px] tracking-[0.22em] uppercase" style={{ color }}>
          {label}
        </span>
      ) : (
        <span className="sr-only">System online</span>
      )}
    </div>
  );
}
