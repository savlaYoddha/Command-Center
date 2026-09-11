import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CommandPanel,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  HudBackButton,
  HudButton,
  HudLink,
  HudSelect,
  LabelBadge,
  LoadingState,
  PageHeader,
  SearchInput,
} from "@/components/ui";
import { notify } from "@/store/toastStore";
import { TaskLifecycleNav } from "../components/TaskLifecycleNav";
import { taskApi } from "../services/tasks";
import type { BoardColumn, TaskCardModel, TaskFilters as Filters, TaskLabel } from "../types";

const emptyFilters: Filters = {
  search: "",
  labelIds: [],
  labelMode: "any",
  priority: "",
  columnId: "",
  due: "any",
};

export function TaskRecyclePage() {
  const [tasks, setTasks] = useState<TaskCardModel[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [nextTasks, nextLabels, nextColumns] = await Promise.all([
      taskApi.tasks(emptyFilters, "trash"),
      taskApi.labels(),
      taskApi.columns(),
    ]);
    setTasks(nextTasks);
    setLabels(nextLabels);
    setColumns(nextColumns);
    setReady(true);
  }, []);

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load recycle bin."));
  }, [reload]);

  const visible = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.columnId && (task.previousColumnId ?? task.columnId) !== filters.columnId && task.columnId !== filters.columnId) {
        return false;
      }
      if (filters.labelIds.length) {
        const assigned = new Set(task.labels.map((label) => label.id));
        if (
          filters.labelMode === "all"
            ? !filters.labelIds.every((id) => assigned.has(id))
            : !filters.labelIds.some((id) => assigned.has(id))
        ) {
          return false;
        }
      }
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const removed = task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : "";
        const hay = [task.number, task.title, task.columnName ?? "", task.priority, removed, ...task.labels.map((label) => label.name)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  if (!ready && !error) return <LoadingState label="LOADING RECYCLE BIN..." />;
  if (error) {
    return (
      <EmptyState kicker="Recycle bin" title="TASK DATABASE OFFLINE" body={error} actionLabel="Retry" onAction={() => void reload()} />
    );
  }

  const pending = tasks.find((task) => task.id === purgeId);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Recoverable deletion"
        title="Recycle bin"
        actions={<HudBackButton label="BACK TO TASKS" to="/tasks" />}
      />
      <TaskLifecycleNav />
      <p className="text-sm text-text-secondary">
        Recycled tasks are removed from active work. Restore them, or delete permanently with confirmation.
      </p>
      <FilterBar>
        <SearchInput
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search ID, title, labels, status, deleted date…"
          aria-label="Search recycle bin"
        />
        <HudSelect
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value as Filters["priority"] })}
        >
          <option value="">Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </HudSelect>
        <HudSelect
          value={filters.columnId}
          onChange={(e) => setFilters({ ...filters, columnId: e.target.value })}
          aria-label="Original status"
        >
          <option value="">Original status</option>
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </HudSelect>
        <HudSelect
          value={filters.labelMode}
          onChange={(e) => setFilters({ ...filters, labelMode: e.target.value as Filters["labelMode"] })}
        >
          <option value="any">Any label</option>
          <option value="all">All labels</option>
        </HudSelect>
      </FilterBar>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`border px-2 py-1 font-display text-[10px] tracking-[0.16em] uppercase ${
            filters.labelIds.length === 0
              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
              : "border-[color:var(--border)] text-text-muted"
          }`}
          onClick={() => setFilters({ ...filters, labelIds: [] })}
        >
          All
        </button>
        {labels.map((label) => {
          const active = filters.labelIds.includes(label.id);
          return (
            <LabelBadge
              key={label.id}
              color={active ? label.color : "var(--cc-text-muted)"}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  labelIds: current.labelIds.includes(label.id)
                    ? current.labelIds.filter((id) => id !== label.id)
                    : [...current.labelIds, label.id],
                }))
              }
            >
              {label.name}
            </LabelBadge>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <EmptyState kicker="Recycle bin" title="RECYCLE BIN EMPTY" body="Trashed tasks appear here until restored or permanently deleted." />
      ) : (
        <div className="space-y-2">
          {visible.map((task) => (
            <CommandPanel key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <HudLink to={`/tasks/${task.number}`}>{task.number}</HudLink>
                <div className="text-sm">{task.title}</div>
                <div className="mt-1 font-display text-[10px] tracking-[0.14em] text-text-muted uppercase">
                  {task.columnName} · {task.priority}
                  {task.deletedAt ? ` · REMOVED ${new Date(task.deletedAt).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {columns.length > 0 &&
                !(task.previousColumnId && columns.some((column) => column.id === task.previousColumnId)) ? (
                  <HudSelect
                    value={destinations[task.id] ?? columns[0]?.id ?? ""}
                    onChange={(e) => setDestinations((current) => ({ ...current, [task.id]: e.target.value }))}
                    aria-label={`Restore destination for ${task.number}`}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.name}
                      </option>
                    ))}
                  </HudSelect>
                ) : null}
                <HudButton
                  type="button"
                  onClick={() => {
                    const previousExists = Boolean(
                      task.previousColumnId && columns.some((column) => column.id === task.previousColumnId),
                    );
                    const destination = previousExists ? undefined : destinations[task.id] ?? columns[0]?.id;
                    void taskApi.restoreTask(task.id, destination).then(() => {
                      notify("success", "TASK RESTORED", task.number);
                      return reload();
                    });
                  }}
                >
                  Restore
                </HudButton>
                <HudButton type="button" variant="danger" onClick={() => setPurgeId(task.id)}>
                  Delete permanently
                </HudButton>
              </div>
            </CommandPanel>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title="Permanently delete task?"
        danger
        confirmLabel="Delete permanently"
        body={<p>This action cannot be undone. {pending?.number} and its comments, checklist, and attachments will be removed.</p>}
        onCancel={() => setPurgeId(null)}
        onConfirm={() => {
          if (!pending) return;
          void taskApi.permanentDeleteTask(pending.id).then(() => {
            notify("warning", "TASK DELETED", pending.number);
            setPurgeId(null);
            return reload();
          });
        }}
      />
    </div>
  );
}
