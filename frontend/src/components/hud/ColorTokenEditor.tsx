import { TOKEN_GROUPS, type ThemeTokenMap } from "@/theme/tokens";
import { HudButton } from "./HudButton";

export function ColorTokenEditor({
  values,
  onChange,
  onReset,
}: {
  values: ThemeTokenMap;
  onChange: (next: ThemeTokenMap) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      {TOKEN_GROUPS.map((group) => (
        <div key={group.id} className="space-y-3">
          <h4 className="font-display text-[10px] tracking-[0.2em] uppercase text-[color:var(--accent)]">{group.label}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.keys.map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 border border-[color:var(--border)] px-2 py-2">
                <span className="text-sm">{item.label}</span>
                <input
                  type="color"
                  aria-label={item.label}
                  value={normalizeHex(values[item.key])}
                  onChange={(event) => onChange({ ...values, [item.key]: event.target.value })}
                  className="h-8 w-10 cursor-pointer bg-transparent"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <HudButton type="button" variant="ghost" className="mt-2" onClick={onReset}>
        Reset to defaults
      </HudButton>
    </div>
  );
}

function normalizeHex(value?: string): string {
  if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#00bfff";
}
