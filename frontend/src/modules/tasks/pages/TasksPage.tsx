import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState, HudButton, LoadingState, PageHeader } from "@/components/ui";
import { notify } from "@/store/toastStore";
import { BoardEditor } from "../components/BoardEditor";
import { KanbanBoard } from "../components/KanbanBoard";
import { TaskCreateModal } from "../components/TaskCreateModal";
import { TaskDrawer } from "../components/TaskDrawer";
import { TaskFilters } from "../components/TaskFilters";
import { LabelManager } from "../components/LabelManager";
import { TaskLifecycleNav } from "../components/TaskLifecycleNav";
import { TaskPage } from "./TaskPage";
import { taskApi } from "../services/tasks";
import type { BoardColumn, SavedFilter, TaskCardModel, TaskFilters as Filters, TaskLabel } from "../types";

const emptyFilters: Filters = {
  search: "",
  labelIds: [],
  labelMode: "any",
  priority: "",
  columnId: "",
  due: "any",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function localStamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayStamp(offset = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return localStamp(date);
}

function startOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return localStamp(date);
}

function endOfWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  return localStamp(date);
}

export function TasksPage() {
  const { taskNumber } = useParams();
  const location = useLocation();
  const overlay = Boolean((location.state as { overlay?: boolean } | null)?.overlay);
  if (taskNumber && !overlay) return <TaskPage />;
  return <TasksBoard />;
}

function TasksBoard() {
  const { taskNumber } = useParams();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<TaskCardModel[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [commentHits, setCommentHits] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [nextColumns, nextTasks, nextLabels, nextSaved] = await Promise.all([
      taskApi.columns(),
      taskApi.tasks(emptyFilters),
      taskApi.labels(),
      taskApi.savedFilters(),
    ]);
    setColumns(nextColumns);
    setTasks(nextTasks);
    setLabels(nextLabels);
    setSaved(nextSaved);
    setReady(true);
  }, []);

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load task board."));
  }, [reload]);

  useEffect(() => {
    const q = filters.search.trim();
    if (!q) {
      setCommentHits(new Set());
      return;
    }
    const handle = window.setTimeout(() => {
      void taskApi.tasks({ ...emptyFilters, search: q }).then((hits) => {
        setCommentHits(new Set(hits.map((task) => task.id)));
      });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [filters.search]);

  const openId = useMemo(() => {
    if (!taskNumber) return null;
    const match = tasks.find((task) => task.number.toUpperCase() === taskNumber.toUpperCase());
    return match?.id ?? null;
  }, [taskNumber, tasks]);

  const visibleTaskIds = useMemo(() => {
    const today = todayStamp();
    const weekFrom = startOfWeek();
    const weekTo = endOfWeek();
    const ids = new Set<string>();
    for (const task of tasks) {
      if (filters.priority && task.priority !== filters.priority) continue;
      if (filters.columnId && task.columnId !== filters.columnId) continue;
      if (filters.due === "today" && task.dueDate !== today) continue;
      if (filters.due === "none" && task.dueDate) continue;
      if (filters.due === "overdue" && !(task.dueDate && task.dueDate < today)) continue;
      if (filters.due === "week" && !(task.dueDate && task.dueDate >= weekFrom && task.dueDate <= weekTo)) continue;
      if (filters.labelIds.length) {
        const assigned = new Set(task.labels.map((label) => label.id));
        const ok =
          filters.labelMode === "all"
            ? filters.labelIds.every((id) => assigned.has(id))
            : filters.labelIds.some((id) => assigned.has(id));
        if (!ok) continue;
      }
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const local = [task.number, task.title, task.description, ...task.labels.map((label) => label.name)]
          .join(" ")
          .toLowerCase();
        if (!local.includes(q) && !commentHits.has(task.id)) continue;
      }
      ids.add(task.id);
    }
    return ids;
  }, [tasks, filters, commentHits]);

  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const column of columns) counts[column.id] = 0;
    for (const task of tasks) counts[task.columnId] = (counts[task.columnId] ?? 0) + 1;
    return counts;
  }, [columns, tasks]);

  if (!ready && !error) return <LoadingState label="TASK SYSTEM INITIALIZING..." />;
  if (error) {
    return (
      <EmptyState
        kicker="System error"
        title="TASK DATABASE OFFLINE"
        body={error}
        actionLabel="Retry"
        onAction={() => {
          setError(null);
          setReady(false);
          void reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="cc-boot-board-header space-y-3">
      <PageHeader
        kicker="Global task board"
        title="Tasks"
        actions={
          <div className="flex flex-wrap gap-2">
            <HudButton type="button" onClick={() => setCreateOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <Plus size={14} /> New task
              </span>
            </HudButton>
            <HudButton type="button" variant="ghost" onClick={() => setBoardOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <Settings2 size={14} /> Edit board
              </span>
            </HudButton>
          </div>
        }
      />
      <TaskLifecycleNav />
      </div>

      <div className="cc-boot-board-filters">
      <TaskFilters
        filters={filters}
        labels={labels}
        columns={columns}
        saved={saved}
        onChange={setFilters}
        onSave={(name) => void taskApi.saveFilter(name, filters).then(reload)}
        onApplySaved={(item) => {
          try {
            setFilters({ ...emptyFilters, ...(JSON.parse(item.payloadJson) as Filters) });
          } catch {
            setFilters(emptyFilters);
          }
        }}
        onRenameSaved={(item) => {
          const name = prompt("Rename filter", item.name);
          if (!name?.trim()) return;
          void taskApi.renameFilter(item.id, name.trim()).then(reload);
        }}
        onDeleteSaved={(id) => void taskApi.deleteFilter(id).then(reload)}
        onManageLabels={() => setLabelsOpen(true)}
      />
      </div>

      <KanbanBoard
        columns={columns}
        tasks={tasks}
        visibleTaskIds={visibleTaskIds}
        disabled={boardOpen}
        onOpenTask={(id) => {
          const task = tasks.find((item) => item.id === id);
          if (task) navigate(`/tasks/${task.number}`, { state: { overlay: true } });
        }}
        onLabelClick={(labelId) => {
          setFilters((current) => ({
            ...current,
            labelIds: current.labelIds.includes(labelId)
              ? current.labelIds.filter((id) => id !== labelId)
              : [...current.labelIds, labelId],
          }));
        }}
        onMove={async (taskId, columnId, orderedIds) => {
          const next = await taskApi.moveTask(taskId, { columnId, position: orderedIds.indexOf(taskId), orderedIds });
          setTasks(next);
          const moved = next.find((item) => item.id === taskId) ?? tasks.find((item) => item.id === taskId);
          notify("success", "STATUS UPDATED", moved?.number);
        }}
      />

      <BoardEditor
        open={boardOpen}
        columns={columns}
        taskCounts={taskCounts}
        onClose={() => setBoardOpen(false)}
        onReorder={async (orderedIds) => {
          setColumns(await taskApi.reorderColumns(orderedIds));
        }}
        onCreate={async (name, description) => {
          await taskApi.createColumn(name, description);
          await reload();
        }}
        onRename={async (id, name, description) => {
          await taskApi.renameColumn(id, name, description);
          await reload();
        }}
        onDelete={async (id, destinationColumnId) => {
          await taskApi.deleteColumn(id, destinationColumnId);
          await reload();
        }}
      />

      <TaskCreateModal
        open={createOpen}
        columns={columns}
        labels={labels}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          await taskApi.createTask(input);
          await reload();
        }}
      />
      <LabelManager
        open={labelsOpen}
        labels={labels}
        onClose={() => setLabelsOpen(false)}
        onCreate={async (name, color) => {
          await taskApi.createLabel(name, color);
          await reload();
        }}
        onUpdate={async (id, patch) => {
          await taskApi.updateLabel(id, patch);
          await reload();
        }}
        onDelete={async (id) => {
          await taskApi.deleteLabel(id);
          await reload();
        }}
      />
      <TaskDrawer
        taskId={openId}
        taskNumber={taskNumber}
        columns={columns}
        labels={labels}
        onClose={() => navigate("/tasks")}
        onChanged={reload}
      />
    </div>
  );
}
