type Props = {
  children: React.ReactNode;
  tone?: "accent" | "muted" | "warn";
};

export function TechBadge({ children, tone = "accent" }: Props) {
  const color =
    tone === "warn" ? "var(--warning)" : tone === "muted" ? "var(--text-muted)" : "var(--accent)";
  return (
    <span
      className="inline-flex border px-2 py-0.5 font-display text-[9px] tracking-[0.16em] uppercase"
      style={{ borderColor: color, color }}
    >
      {children}
    </span>
  );
}
