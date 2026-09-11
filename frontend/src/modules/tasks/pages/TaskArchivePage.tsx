import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskLifecycleNav } from "../components/TaskLifecycleNav";
import {
  CommandPanel,
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
import { taskApi } from "../services/tasks";
import type { SavedFilter, TaskCardModel, TaskFilters as Filters, TaskLabel } from "../types";

const emptyFilters: Filters = {
  search: "",
  labelIds: [],
  labelMode: "any",
  priority: "",
  columnId: "",
  due: "any",
};

export function TaskArchivePage() {
  const [tasks, setTasks] = useState<TaskCardModel[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [nextTasks, nextLabels, nextSaved] = await Promise.all([
      taskApi.tasks(emptyFilters, "archived"),
      taskApi.labels(),
      taskApi.savedFilters(),
    ]);
    setTasks(nextTasks);
    setLabels(nextLabels);
    setSaved(nextSaved);
    setReady(true);
  }, []);

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load archive."));
  }, [reload]);

  const visible = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.labelIds.length) {
        const assigned = new Set(task.labels.map((label) => label.id));
        return filters.labelMode === "all"
          ? filters.labelIds.every((id) => assigned.has(id))
          : filters.labelIds.some((id) => assigned.has(id));
      }
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const hay = [task.number, task.title, ...task.labels.map((label) => label.name)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  if (!ready && !error) return <LoadingState label="LOADING TASK ARCHIVE..." />;
  if (error) {
    return <EmptyState kicker="Archive" title="TASK DATABASE OFFLINE" body={error} actionLabel="Retry" onAction={() => void reload()} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Historical records"
        title="Archived tasks"
        actions={<HudBackButton label="BACK TO TASKS" to="/tasks" />}
      />
      <TaskLifecycleNav />
      <FilterBar>
        <SearchInput
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Search archived tasks..."
          aria-label="Search archived tasks"
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
      {saved.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {saved.map((item) => (
            <HudButton
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => {
                try {
                  setFilters({ ...emptyFilters, ...(JSON.parse(item.payloadJson) as Filters) });
                } catch {
                  setFilters(emptyFilters);
                }
              }}
            >
              {item.name}
            </HudButton>
          ))}
        </div>
      ) : null}
      {visible.length === 0 ? (
        <EmptyState kicker="Archive" title="NO ARCHIVED TASKS FOUND" body="Completed work stays here after seven days in Done." />
      ) : (
        <div className="space-y-2">
          {visible.map((task) => (
            <CommandPanel key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <HudLink to={`/tasks/${task.number}`}>{task.number}</HudLink>
                <div className="text-sm">{task.title}</div>
                <div className="mt-1 font-display text-[10px] tracking-[0.14em] text-text-muted uppercase">
                  {task.columnName} · {task.priority}
                  {task.completedAt ? ` · COMPLETED ${new Date(task.completedAt).toLocaleDateString()}` : ""}
                </div>
              </div>
              <HudButton
                type="button"
                onClick={() => {
                  void taskApi.unarchiveTask(task.id).then(() => {
                    notify("success", "TASK RESTORED", task.number);
                    return reload();
                  });
                }}
              >
                Restore task
              </HudButton>
            </CommandPanel>
          ))}
        </div>
      )}
    </div>
  );
}
