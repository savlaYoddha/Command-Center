import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HudButton } from "@/components/hud/HudButton";
import { SearchInput } from "@/components/hud/SearchInput";
import { EmptyState } from "@/components/hud/EmptyState";
import { ErrorState } from "./Feedback";
import { CheckboxControl } from "./FormControls";
import { HudSkeleton } from "@/components/hud/motion";
import { Pagination } from "./Pagination";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  visible?: boolean;
  className?: string;
};

type SortState = { id: string; direction: "asc" | "desc" } | null;

type Props<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  selectable?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  onClearFilters?: () => void;
  rowActions?: (row: T) => ReactNode;
  columnVisibility?: boolean;
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchable = false,
  searchPlaceholder = "Search…",
  searchFilter,
  sortable = false,
  pagination = false,
  pageSize = 10,
  selectable = false,
  loading = false,
  error = null,
  emptyTitle = "NO RECORDS",
  emptyBody = "No rows match the current filters.",
  onClearFilters,
  rowActions,
  columnVisibility = false,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible !== false && !hidden.has(col.id)),
    [columns, hidden],
  );

  const filtered = useMemo(() => {
    let rows = [...data];
    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((row) => (searchFilter ? searchFilter(row, q) : JSON.stringify(row).toLowerCase().includes(q)));
    }
    if (sortable && sort) {
      const col = columns.find((c) => c.id === sort.id);
      if (col?.sortValue) {
        rows.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sort.direction === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [columns, data, query, searchFilter, searchable, sort, sortable]);

  const paged = useMemo(() => {
    if (!pagination) return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, pagination]);

  const allVisibleSelected = paged.length > 0 && paged.every((row) => selected.has(rowKey(row)));

  function toggleSort(id: string) {
    if (!sortable) return;
    setSort((current) => {
      if (!current || current.id !== id) return { id, direction: "asc" };
      if (current.direction === "asc") return { id, direction: "desc" };
      return null;
    });
  }

  if (loading) {
    return (
      <div className="space-y-2 border border-[color:var(--border)] p-4">
        <HudSkeleton lines={6} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} actionLabel={onClearFilters ? "Clear filters" : undefined} onAction={onClearFilters} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <SearchInput value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={searchPlaceholder} aria-label="Search table" />
        ) : null}
        {columnVisibility ? (
          <div className="flex flex-wrap gap-1">
            {columns.map((col) => (
              <HudButton
                key={col.id}
                type="button"
                variant="ghost"
                onClick={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (next.has(col.id)) next.delete(col.id);
                    else next.add(col.id);
                    return next;
                  })
                }
              >
                {hidden.has(col.id) ? `Show ${col.header}` : `Hide ${col.header}`}
              </HudButton>
            ))}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto border border-[color:var(--border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[color:var(--border)] bg-[color:var(--bg-secondary)]">
            <tr>
              {selectable ? (
                <th className="px-3 py-2">
                  <CheckboxControl
                    checked={allVisibleSelected}
                    onChange={(next) => {
                      if (next) {
                        setSelected((prev) => {
                          const nextSet = new Set(prev);
                          paged.forEach((row) => nextSet.add(rowKey(row)));
                          return nextSet;
                        });
                      } else {
                        setSelected((prev) => {
                          const nextSet = new Set(prev);
                          paged.forEach((row) => nextSet.delete(rowKey(row)));
                          return nextSet;
                        });
                      }
                    }}
                    aria-label="Select all rows"
                  />
                </th>
              ) : null}
              {visibleColumns.map((col) => (
                <th key={col.id} className={`px-3 py-2 font-display text-[10px] tracking-[0.16em] uppercase text-text-muted ${col.className ?? ""}`}>
                  {sortable && col.sortValue ? (
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[color:var(--accent)]" onClick={() => toggleSort(col.id)}>
                      {col.header}
                      {sort?.id === col.id ? sort.direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} /> : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions ? <th className="px-3 py-2 font-display text-[10px] tracking-[0.16em] uppercase text-text-muted">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                  <EmptyState
                    kicker="Data table"
                    title={emptyTitle}
                    body={emptyBody}
                    actionLabel={onClearFilters ? "Clear filters" : undefined}
                    onAction={onClearFilters}
                  />
                </td>
              </tr>
            ) : (
              paged.map((row) => {
                const key = rowKey(row);
                return (
                  <tr key={key} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--surface)]">
                    {selectable ? (
                      <td className="px-3 py-2">
                        <CheckboxControl
                          checked={selected.has(key)}
                          onChange={(next) =>
                            setSelected((prev) => {
                              const nextSet = new Set(prev);
                              if (next) nextSet.add(key);
                              else nextSet.delete(key);
                              return nextSet;
                            })
                          }
                          aria-label={`Select row ${key}`}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td key={col.id} className={`px-3 py-2 text-text-primary ${col.className ?? ""}`}>
                        {col.accessor ? col.accessor(row) : null}
                      </td>
                    ))}
                    {rowActions ? <td className="px-3 py-2">{rowActions(row)}</td> : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && filtered.length > 0 ? (
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      ) : null}
    </div>
  );
}
