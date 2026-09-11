import { Link } from "react-router-dom";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`block ${compact ? "" : "px-1"} no-underline`} aria-label="COMMANDCENTER home">
      <div className="font-display text-sm tracking-[0.18em] uppercase">
        <span className="text-text-primary">COMMAND</span>
        <span className="text-[color:var(--accent)]">CENTER</span>
      </div>
      {compact ? null : (
        <div className="mt-1 font-display text-[9px] tracking-[0.22em] text-text-muted uppercase">
          Personal unified command center
        </div>
      )}
    </Link>
  );
}
