export function NeonBorder({ className = "" }: { className?: string }) {
  return <div className={`pointer-events-none absolute inset-0 border border-[color:var(--accent)]/40 ${className}`} />;
}
