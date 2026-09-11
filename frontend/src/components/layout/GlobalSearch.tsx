import { modules } from "@/modules/registry";
import { useUiStore } from "@/store/uiStore";
import { HudModal } from "@/components/hud/HudModal";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return modules.filter((m) => m.nav);
    return modules.filter(
      (m) => m.name.toLowerCase().includes(query) || m.subtitle.toLowerCase().includes(query),
    );
  }, [q]);

  return (
    <HudModal open={open} title="Global search" onClose={() => setSearchOpen(false)}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tasks, documents, vehicles…"
        className="mb-4 w-full border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
      />
      <div className="space-y-1">
        {results.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={() => setSearchOpen(false)}
            className="flex items-center justify-between border border-transparent px-3 py-2 hover:border-[color:var(--border)]"
          >
            <span className="font-display text-xs tracking-[0.16em] uppercase">{item.name}</span>
            <span className="text-xs text-text-muted">{item.subtitle}</span>
          </Link>
        ))}
      </div>
    </HudModal>
  );
}
