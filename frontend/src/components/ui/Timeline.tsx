import type { ReactNode } from "react";

export type TimelineItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  meta?: string;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          {index < items.length - 1 ? (
            <span className="absolute left-[5px] top-3 h-[calc(100%-0.5rem)] w-px bg-[color:var(--border)]" aria-hidden />
          ) : null}
          <span className="relative z-[1] mt-1 h-2.5 w-2.5 shrink-0 border border-[color:var(--accent)] bg-[color:var(--bg-primary)]" />
          <div className="min-w-0 flex-1 border-b border-[color:var(--border)] pb-4 last:border-0">
            <div className="font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">{item.time}</div>
            <div className="mt-1 text-sm text-text-primary">{item.title}</div>
            {item.description ? <div className="mt-1 text-sm text-text-secondary">{item.description}</div> : null}
            {item.meta ? <div className="mt-1 font-display text-[9px] tracking-[0.18em] text-text-muted uppercase">{item.meta}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelineCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
      <div className="mb-4 font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">{title}</div>
      {children}
    </div>
  );
}
