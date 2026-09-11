import type { ReactNode } from "react";
import { priorityColors, statusColors, type PriorityLevel, type StatusTone } from "./status";

type BadgeProps = {
  children: ReactNode;
  color?: string;
  className?: string;
};

export function Badge({ children, color = "var(--accent)", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-display text-[9px] tracking-[0.16em] uppercase ${className}`}
      style={{ borderColor: color, color }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: StatusTone; label?: string }) {
  const color = statusColors[status];
  return <Badge color={color}>{label ?? status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const color = priorityColors[priority];
  return <Badge color={color}>{priority}</Badge>;
}
