import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CommandPanel } from "./CommandPanel";

type Props = {
  name: string;
  path: string;
  icon: LucideIcon;
  primary: number | string;
  primaryLabel: string;
  secondary: number | string;
  secondaryLabel: string;
};

export function ModuleTile({
  name,
  path,
  icon: Icon,
  primary,
  primaryLabel,
  secondary,
  secondaryLabel,
}: Props) {
  return (
    <Link to={path} className="group block">
      <CommandPanel hatch className="h-full p-5 transition-shadow duration-[var(--anim)] hover:shadow-hud">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[color:var(--accent)]">
            <Icon size={16} />
            <span className="font-display text-[11px] tracking-[0.22em] uppercase">{name}</span>
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
        </div>
        <div className="mt-6 font-display text-4xl tracking-wider text-text-primary">{primary}</div>
        <div className="mt-1 font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">
          {primaryLabel}
        </div>
        <div className="mt-5 text-xs tracking-[0.16em] text-text-secondary uppercase">
          {String(secondary).padStart(2, "0")} {secondaryLabel}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[color:var(--border)] pt-3 font-display text-[10px] tracking-[0.18em] text-[color:var(--accent)] uppercase">
          OPEN MODULE
          <ArrowRight size={14} className="transition-transform duration-[var(--anim)] group-hover:translate-x-1" />
        </div>
      </CommandPanel>
    </Link>
  );
}
