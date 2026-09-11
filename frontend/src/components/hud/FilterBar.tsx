import type { ReactNode } from "react";

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border border-[color:var(--border)] bg-[color:var(--bg-secondary)] px-3 py-2">
      {children}
    </div>
  );
}
