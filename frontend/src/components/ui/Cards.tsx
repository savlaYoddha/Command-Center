import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { HudButton } from "@/components/hud/HudButton";
import { StatusBadge } from "./Badge";
import type { StatusTone } from "./status";
import { priorityColors, type PriorityLevel } from "./status";

type CardBase = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  footer?: ReactNode;
  className?: string;
};

export function Card({ title, description, icon: Icon, footer, className = "", children }: CardBase & { children?: ReactNode }) {
  return (
    <CommandPanel className={`p-[var(--cc-panel-padding)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">{title}</div>
          {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
        </div>
        {Icon ? <Icon size={18} className="text-[color:var(--accent)]" /> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-[color:var(--border)] pt-3">{footer}</div> : null}
    </CommandPanel>
  );
}

export function StatCard({ title, value, trend, description }: { title: string; value: string; trend?: string; description?: string }) {
  return (
    <Card title={title} description={description}>
      <div className="font-display text-2xl tracking-[0.08em] text-[color:var(--accent)]">{value}</div>
      {trend ? <div className="mt-2 text-xs text-[color:var(--success)]">{trend}</div> : null}
    </Card>
  );
}

export function SummaryCard({ title, items }: { title: string; items: Array<{ label: string; value: string }> }) {
  return (
    <Card title={title}>
      <dl className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-text-muted">{item.label}</dt>
            <dd className="font-display tracking-[0.08em]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function StatusCard({ title, status, body, actionLabel, onAction }: { title: string; status: StatusTone; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card title={title} footer={actionLabel && onAction ? <HudButton onClick={onAction}>{actionLabel}</HudButton> : undefined}>
      <StatusBadge status={status} />
      <p className="mt-3 text-sm text-text-secondary">{body}</p>
    </Card>
  );
}

export function ActionCard({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <Card title={title} description={description} footer={<HudButton onClick={onAction}>{actionLabel}</HudButton>} />
  );
}

export function PriorityCard({ title, priority, value }: { title: string; priority: PriorityLevel; value: string }) {
  return (
    <Card title={title}>
      <div className="font-display text-xl" style={{ color: priorityColors[priority] }}>
        {value}
      </div>
      <div className="mt-2 font-display text-[10px] tracking-[0.16em] uppercase" style={{ color: priorityColors[priority] }}>
        {priority}
      </div>
    </Card>
  );
}

// Re-export panel alias
export { CommandPanel as Panel } from "@/components/hud/CommandPanel";
