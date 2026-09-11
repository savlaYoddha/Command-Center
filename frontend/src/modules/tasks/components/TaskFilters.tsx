import { useState } from "react";
import { FilterBar, HudButton, HudInput, HudSelect, LabelBadge, SearchInput } from "@/components/ui";
import type { BoardColumn, SavedFilter, TaskFilters, TaskLabel } from "../types";

type Props = {
  filters: TaskFilters;
  labels: TaskLabel[];
  columns: BoardColumn[];
  saved: SavedFilter[];
  onChange: (filters: TaskFilters) => void;
  onSave: (name: string) => void;
  onApplySaved: (filter: SavedFilter) => void;
  onRenameSaved: (filter: SavedFilter) => void;
  onDeleteSaved: (id: string) => void;
  onManageLabels: () => void;
};

export function TaskFilters({
  filters,
  labels,
  columns,
  saved,
  onChange,
  onSave,
  onApplySaved,
  onRenameSaved,
  onDeleteSaved,
  onManageLabels,
}: Props) {
  const [savedName, setSavedName] = useState("");

  function toggleLabel(id: string) {
    const labelIds = filters.labelIds.includes(id)
      ? filters.labelIds.filter((item) => item !== id)
      : [...filters.labelIds, id];
    onChange({ ...filters, labelIds });
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <SearchInput
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search ID, title, labels, comments…"
          aria-label="Search tasks"
        />
        <HudSelect
          value={filters.priority}
          onChange={(e) => onChange({ ...filters, priority: e.target.value as TaskFilters["priority"] })}
        >
          <option value="">Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </HudSelect>
        <HudSelect value={filters.columnId} onChange={(e) => onChange({ ...filters, columnId: e.target.value })}>
          <option value="">Column</option>
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </HudSelect>
        <HudSelect
          value={filters.due}
          onChange={(e) => onChange({ ...filters, due: e.target.value as TaskFilters["due"] })}
        >
          <option value="any">Due date</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="overdue">Overdue</option>
          <option value="none">No date</option>
        </HudSelect>
        <HudSelect
          value={filters.labelMode}
          onChange={(e) => onChange({ ...filters, labelMode: e.target.value as TaskFilters["labelMode"] })}
        >
          <option value="any">Any label</option>
          <option value="all">All labels</option>
        </HudSelect>
        <HudButton variant="ghost" type="button" onClick={onManageLabels}>
          Labels
        </HudButton>
      </FilterBar>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`border px-2 py-1 font-display text-[10px] tracking-[0.16em] uppercase ${
            filters.labelIds.length === 0
              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
              : "border-[color:var(--border)] text-text-muted"
          }`}
          onClick={() => onChange({ ...filters, labelIds: [] })}
        >
          All
        </button>
        {labels.map((label) => {
          const active = filters.labelIds.includes(label.id);
          return (
            <LabelBadge key={label.id} color={active ? label.color : "var(--cc-text-muted)"} onClick={() => toggleLabel(label.id)}>
              {label.name}
            </LabelBadge>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <HudInput
            label="Save current filter"
            value={savedName}
            onChange={(e) => setSavedName(e.target.value)}
            placeholder="My Work"
          />
        </div>
        <HudButton
          type="button"
          variant="ghost"
          onClick={() => {
            if (!savedName.trim()) return;
            onSave(savedName.trim());
            setSavedName("");
          }}
        >
          Save filter
        </HudButton>
        {saved.map((item) => (
          <div key={item.id} className="flex items-center gap-1 border border-[color:var(--border)] px-2 py-1">
            <button
              type="button"
              className="font-display text-[10px] tracking-[0.14em] uppercase text-[color:var(--accent)]"
              onClick={() => onApplySaved(item)}
            >
              {item.name}
            </button>
            <button type="button" className="text-[10px] text-text-muted" onClick={() => onRenameSaved(item)}>
              Rename
            </button>
            <button
              type="button"
              className="text-[10px] text-[color:var(--danger)]"
              onClick={() => onDeleteSaved(item.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
