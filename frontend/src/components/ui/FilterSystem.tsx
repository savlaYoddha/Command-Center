import type { ReactNode } from "react";
import { HudDatePicker } from "@/components/hud/HudDatePicker";
import { HudInput } from "@/components/hud/HudInput";
import { CheckboxControl } from "./FormControls";
import { HudSelect } from "@/components/hud/HudSelect";
import { SearchInput } from "@/components/hud/SearchInput";
import { HudButton } from "@/components/hud/HudButton";
import { FilterBar } from "@/components/hud/FilterBar";

export type FilterChip = { id: string; label: string };

export type FilterDef =
  | { id: string; type: "search"; placeholder?: string }
  | { id: string; type: "select"; label?: string; options: Array<{ value: string; label: string }> }
  | { id: string; type: "multi"; label?: string; options: Array<{ value: string; label: string }> }
  | { id: string; type: "date-range"; label?: string }
  | { id: string; type: "number-range"; label?: string }
  | { id: string; type: "boolean"; label: string };

export type FilterValues = Record<string, string | string[] | boolean | { from: string; to: string } | { min: string; max: string }>;

type Props = {
  filters: FilterDef[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  chips?: FilterChip[];
  onRemoveChip?: (id: string) => void;
  onClearAll?: () => void;
  children?: ReactNode;
};

export function FilterChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 border border-[color:var(--accent)] px-2 py-1 font-display text-[9px] tracking-[0.14em] text-[color:var(--accent)] uppercase"
      onClick={onRemove}
    >
      {label}
      {onRemove ? <span aria-hidden>×</span> : null}
    </button>
  );
}

export function ComposableFilterBar({ filters, values, onChange, chips = [], onRemoveChip, onClearAll, children }: Props) {
  function setValue(id: string, value: FilterValues[string]) {
    onChange({ ...values, [id]: value });
  }

  return (
    <div className="space-y-2">
      <FilterBar>
        {filters.map((filter) => {
          if (filter.type === "search") {
            return (
              <SearchInput
                key={filter.id}
                value={String(values[filter.id] ?? "")}
                onChange={(e) => setValue(filter.id, e.target.value)}
                placeholder={filter.placeholder ?? "Search…"}
                aria-label={filter.placeholder ?? "Search"}
              />
            );
          }
          if (filter.type === "select") {
            return (
              <HudSelect key={filter.id} label={filter.label} value={String(values[filter.id] ?? "")} onChange={(e) => setValue(filter.id, e.target.value)}>
                <option value="">All</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </HudSelect>
            );
          }
          if (filter.type === "multi") {
            const selected = Array.isArray(values[filter.id]) ? (values[filter.id] as string[]) : [];
            return (
              <div key={filter.id} className="flex flex-wrap gap-1">
                {filter.options.map((opt) => {
                  const active = selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`border px-2 py-1 font-display text-[9px] tracking-[0.14em] uppercase ${
                        active ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--border)] text-text-muted"
                      }`}
                      onClick={() => {
                        const next = active ? selected.filter((v) => v !== opt.value) : [...selected, opt.value];
                        setValue(filter.id, next);
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            );
          }
          if (filter.type === "date-range") {
            const range = (values[filter.id] as { from: string; to: string }) ?? { from: "", to: "" };
            return (
              <div key={filter.id} className="flex flex-wrap items-end gap-2">
                <HudDatePicker label={filter.label ? `${filter.label} from` : "From"} value={range.from || null} onChange={(v) => setValue(filter.id, { ...range, from: v ?? "" })} />
                <HudDatePicker label="To" value={range.to || null} onChange={(v) => setValue(filter.id, { ...range, to: v ?? "" })} />
              </div>
            );
          }
          if (filter.type === "number-range") {
            const range = (values[filter.id] as { min: string; max: string }) ?? { min: "", max: "" };
            return (
              <div key={filter.id} className="flex flex-wrap items-end gap-2">
                <HudInput label={filter.label ? `${filter.label} min` : "Min"} type="number" value={range.min} onChange={(e) => setValue(filter.id, { ...range, min: e.target.value })} />
                <HudInput label="Max" type="number" value={range.max} onChange={(e) => setValue(filter.id, { ...range, max: e.target.value })} />
              </div>
            );
          }
          return (
            <label key={filter.id} className="inline-flex items-center gap-2 font-display text-[10px] tracking-[0.14em] uppercase text-text-muted">
              <CheckboxControl aria-label={filter.label} checked={Boolean(values[filter.id])} onChange={(checked) => setValue(filter.id, checked)} />
              {filter.label}
            </label>
          );
        })}
        {children}
        {onClearAll ? (
          <HudButton type="button" variant="ghost" onClick={onClearAll}>
            Clear all
          </HudButton>
        ) : null}
      </FilterBar>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip.id} label={chip.label} onRemove={onRemoveChip ? () => onRemoveChip(chip.id) : undefined} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
