import { BUILTIN_THEMES } from "@/theme/presets";
import type { CustomTheme } from "@/theme/tokens";

type Props = {
  activeId: string;
  customThemes: CustomTheme[];
  onApply: (id: string) => void;
};

export function ThemePresetCard({
  id,
  name,
  description,
  active,
  swatch,
  onApply,
  builtin = true,
}: {
  id: string;
  name: string;
  description: string;
  active: boolean;
  swatch: string;
  onApply: (id: string) => void;
  builtin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onApply(id)}
      className={`border p-3 text-left transition-colors duration-[var(--anim)] ${
        active ? "border-[color:var(--accent)]" : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
      }`}
    >
      <div className="mb-2 h-8 w-full border border-[color:var(--border)]" style={{ background: swatch }} />
      <div className="font-display text-[10px] tracking-[0.16em] uppercase">{name}</div>
      <div className="mt-1 text-xs text-text-muted">
        {builtin ? "SYSTEM" : "OPERATOR"} · {description}
      </div>
    </button>
  );
}

export function ThemePresetGrid({ activeId, customThemes, onApply }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {BUILTIN_THEMES.map((theme) => (
        <ThemePresetCard
          key={theme.id}
          id={theme.id}
          name={theme.name}
          description={theme.description}
          active={activeId === theme.id}
          swatch={theme.dark["--accent"] ?? "#00bfff"}
          onApply={onApply}
        />
      ))}
      {customThemes.map((theme) => (
        <ThemePresetCard
          key={theme.id}
          id={theme.id}
          name={theme.name}
          description="Saved operator theme"
          active={activeId === theme.id}
          swatch={theme.tokens["--accent"] ?? "#00bfff"}
          onApply={onApply}
          builtin={false}
        />
      ))}
    </div>
  );
}
