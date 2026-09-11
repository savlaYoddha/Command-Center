import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  hatch?: boolean;
  highlighted?: boolean;
};

export function CommandPanel({ children, className = "", hatch = false, highlighted = false }: PanelProps) {
  return (
    <div className={`relative clip-hud bg-surface/90 ${highlighted ? "shadow-hud" : ""} ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 border"
        style={{ borderColor: highlighted ? "var(--accent)" : "var(--border)" }}
      />
      <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[color:var(--accent)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[color:var(--accent)]" />
      {hatch ? <div className="hatch pointer-events-none absolute right-3 top-0 h-3 w-16 opacity-70" /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}
