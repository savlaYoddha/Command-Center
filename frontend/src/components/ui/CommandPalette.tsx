import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HudModal } from "@/components/hud/HudModal";
import { modules } from "@/modules/registry";

export type CommandItem = {
  id: string;
  label: string;
  group?: string;
  keywords?: string[];
  action: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  commands?: CommandItem[];
  title?: string;
};

export function CommandPalette({ open, onClose, commands, title = "Command palette" }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const defaults = useMemo<CommandItem[]>(
    () =>
      modules
        .filter((mod) => mod.nav || mod.id === "settings")
        .map((mod) => ({
          id: mod.id,
          label: `Open ${mod.name}`,
          group: "Navigation",
          keywords: [mod.name, mod.subtitle],
          action: () => navigate(mod.path),
        })),
    [navigate],
  );

  const all = commands ?? defaults;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((item) => {
      const hay = [item.label, item.group ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [all, query]);

  return (
    <HudModal open={open} title={title} onClose={onClose} size="lg">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a command…"
        className="mb-4 w-full border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex w-full items-center justify-between border border-transparent px-3 py-2 text-left hover:border-[color:var(--border)]"
            onClick={() => {
              item.action();
              onClose();
              setQuery("");
            }}
          >
            <span className="font-display text-xs tracking-[0.16em] uppercase">{item.label}</span>
            {item.group ? <span className="text-xs text-text-muted">{item.group}</span> : null}
          </button>
        ))}
        {results.length === 0 ? <p className="px-3 py-2 text-sm text-text-muted">No commands found.</p> : null}
      </div>
    </HudModal>
  );
}
