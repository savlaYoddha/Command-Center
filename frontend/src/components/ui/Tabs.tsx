import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type TabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  content?: ReactNode;
};

type Props = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Tabs({ tabs, activeId, onChange, className = "" }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: true });

  function updateScrollState() {
    const element = scrollerRef.current;
    if (!element) return;
    const threshold = 2;
    setScrollState({
      atStart: element.scrollLeft <= threshold,
      atEnd: element.scrollLeft + element.clientWidth >= element.scrollWidth - threshold,
    });
  }

  useEffect(() => {
    updateScrollState();
    const element = scrollerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(element);
    return () => observer.disconnect();
  }, [tabs.length]);

  function scrollTabs(direction: "left" | "right") {
    scrollerRef.current?.scrollBy({
      left: (direction === "left" ? -1 : 1) * Math.max(scrollerRef.current.clientWidth * 0.7, 180),
      behavior: "smooth",
    });
  }

  return (
    <div className={className}>
      <div className="flex items-stretch border-b border-[color:var(--border)]">
        <button
          type="button"
          aria-label="Scroll tabs left"
          title="Scroll tabs left"
          disabled={scrollState.atStart}
          onClick={() => scrollTabs("left")}
          className="shrink-0 border-r border-[color:var(--border)] px-2 text-[color:var(--accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-25"
        >
          <ChevronLeft size={16} />
        </button>
        <div
          ref={scrollerRef}
          onScroll={updateScrollState}
          className="min-w-0 flex-1 overflow-x-auto scroll-smooth overscroll-x-contain"
          role="tablist"
          aria-label="Section tabs"
        >
          <div className="flex min-w-max flex-nowrap gap-1">
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 font-display text-[10px] tracking-[0.16em] uppercase transition-colors duration-[var(--anim)] ${
                    active
                      ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                      : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
                  onClick={() => onChange(tab.id)}
                >
                  {Icon ? <Icon size={14} /> : null}
                  {tab.label}
                  {tab.badge !== undefined ? (
                    <span className="border border-[color:var(--border)] px-1.5 text-[9px]">{tab.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Scroll tabs right"
          title="Scroll tabs right"
          disabled={scrollState.atEnd}
          onClick={() => scrollTabs("right")}
          className="shrink-0 border-l border-[color:var(--border)] px-2 text-[color:var(--accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-25"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {tabs.find((tab) => tab.id === activeId)?.content ? (
        <div className="pt-4" role="tabpanel">
          {tabs.find((tab) => tab.id === activeId)?.content}
        </div>
      ) : null}
    </div>
  );
}
