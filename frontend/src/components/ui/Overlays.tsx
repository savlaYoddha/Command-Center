import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 font-display text-[9px] tracking-[0.14em] uppercase text-text-primary group-hover:block group-focus-within:block">
        {label}
      </span>
    </span>
  );
}

export function Popover({ trigger, children, open, onOpenChange }: { trigger: ReactNode; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internal, setInternal] = useState(false);
  const active = open ?? internal;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        if (onOpenChange) onOpenChange(false);
        else setInternal(false);
      }
    }
    if (active) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [active, onOpenChange]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          const next = !active;
          if (onOpenChange) onOpenChange(next);
          else setInternal(next);
        }}
      >
        {trigger}
      </button>
      {active ? (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[12rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 shadow-hud">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Accordion({ items }: { items: Array<{ id: string; title: string; content: ReactNode }> }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)]">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left font-display text-[10px] tracking-[0.16em] uppercase"
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
            >
              {item.title}
              <ChevronRight size={14} className={`transition-transform duration-[var(--anim)] ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? <div className="border-t border-[color:var(--border)] px-4 py-3 text-sm text-text-secondary">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 font-display text-[10px] tracking-[0.16em] uppercase text-text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <ChevronRight size={12} /> : null}
          {item.to ? (
            <Link to={item.to} className="text-[color:var(--accent)] no-underline hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
