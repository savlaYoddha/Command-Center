import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CommandPanel } from "@/components/ui";
import { useBoot } from "@/motion/boot";
import { TaskCard } from "./TaskCard";
import type { BoardColumn, TaskCardModel } from "../types";

type Items = Record<string, string[]>;

type Props = {
  columns: BoardColumn[];
  tasks: TaskCardModel[];
  visibleTaskIds: Set<string>;
  disabled?: boolean;
  onOpenTask: (id: string) => void;
  onMove: (taskId: string, columnId: string, orderedIds: string[]) => Promise<void>;
  onLabelClick?: (labelId: string) => void;
};

function buildItems(columns: BoardColumn[], tasks: TaskCardModel[], visible: Set<string>): Items {
  const map: Items = {};
  for (const column of columns) map[column.id] = [];
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    if (!visible.has(task.id) || !map[task.columnId]) continue;
    map[task.columnId].push(task.id);
  }
  return map;
}

function findContainer(id: UniqueIdentifier, items: Items): string | null {
  const key = String(id);
  if (key in items) return key;
  return Object.keys(items).find((columnId) => items[columnId].includes(key)) ?? null;
}

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCorners(args);
};

function SortableTask({
  task,
  disabled,
  onOpen,
  onLabelClick,
  suppressClick,
}: {
  task: TaskCardModel;
  disabled?: boolean;
  onOpen: (id: string) => void;
  onLabelClick?: (labelId: string) => void;
  suppressClick: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
    data: { type: "task", columnId: task.columnId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  const { onKeyDown: dndKeyDown, ...dndListeners } = listeners ?? {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab touch-none"
      {...attributes}
      {...dndListeners}
      onClick={() => {
        if (suppressClick()) return;
        onOpen(task.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (!suppressClick()) onOpen(task.id);
          return;
        }
        dndKeyDown?.(event);
      }}
      role="button"
      tabIndex={0}
      aria-label={`${task.number} ${task.title}`}
    >
      <TaskCard task={task} dragging={isDragging} onLabelClick={onLabelClick} />
    </div>
  );
}

function DropColumn({
  column,
  taskIds,
  tasksById,
  isOver,
  disabled,
  onOpen,
  onLabelClick,
  suppressClick,
  columnIndex,
  boot,
}: {
  column: BoardColumn;
  taskIds: string[];
  tasksById: Map<string, TaskCardModel>;
  isOver: boolean;
  disabled?: boolean;
  onOpen: (id: string) => void;
  onLabelClick?: (labelId: string) => void;
  suppressClick: () => boolean;
  columnIndex: number;
  boot: boolean;
}) {
  const { setNodeRef, isOver: droppableOver } = useDroppable({
    id: column.id,
    disabled,
    data: { type: "column", columnId: column.id },
  });
  const highlighted = isOver || droppableOver;

  return (
    <div
      className={`w-[280px] shrink-0 ${boot ? "cc-boot-col" : ""}`}
      style={boot ? { animationDelay: `calc(var(--cc-stagger-medium) * ${10 + Math.min(columnIndex, 6)})` } : undefined}
    >
      <div ref={setNodeRef} className="h-full">
        <CommandPanel highlighted={highlighted} className="flex h-full min-h-[420px] flex-col p-[var(--cc-panel-padding)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-[11px] tracking-[0.16em] uppercase text-[color:var(--accent)]">{column.name}</h3>
            <span className="font-display text-[10px] text-text-muted">{taskIds.length}</span>
          </div>
          {highlighted ? (
            <div className="mb-2 border border-dashed border-[color:var(--cc-accent)] px-2 py-1 text-center font-display text-[10px] tracking-[0.2em] text-[color:var(--cc-accent)] uppercase">
              Drop here
            </div>
          ) : null}
          <div className="flex min-h-[320px] flex-1 flex-col" style={{ gap: "var(--cc-card-gap)" }}>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {taskIds.map((id, cardIndex) => {
                const task = tasksById.get(id);
                if (!task) return null;
                const delayIndex = Math.min(cardIndex, 8);
                return (
                  <div
                    key={id}
                    className={boot ? "cc-boot-card hud-card-reveal" : undefined}
                    style={boot ? { animationDelay: `calc(var(--cc-stagger-small) * ${delayIndex + 12})` } : undefined}
                  >
                  <SortableTask
                    task={task}
                    disabled={disabled}
                    onOpen={onOpen}
                    onLabelClick={onLabelClick}
                    suppressClick={suppressClick}
                  />
                  </div>
                );
              })}
            </SortableContext>
          </div>
        </CommandPanel>
      </div>
    </div>
  );
}

export function KanbanBoard({
  columns,
  tasks,
  visibleTaskIds,
  disabled = false,
  onOpenTask,
  onMove,
  onLabelClick,
}: Props) {
  const { booting } = useBoot();
  const [items, setItems] = useState<Items>(() => buildItems(columns, tasks, visibleTaskIds));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const draggedRef = useRef(false);
  const draggingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!draggingRef.current) {
      setItems(buildItems(columns, tasks, visibleTaskIds));
    }
  }, [columns, tasks, visibleTaskIds]);

  const liveSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const activeTask = activeId ? tasksById.get(activeId) ?? null : null;

  function suppressClick() {
    return draggedRef.current;
  }

  function onDragStart(event: DragStartEvent) {
    draggingRef.current = true;
    draggedRef.current = true;
    setActiveId(String(event.active.id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const currentItems = itemsRef.current;
    const from = findContainer(active.id, currentItems);
    const to = findContainer(over.id, currentItems);
    if (!from || !to) return;
    setOverColumnId(to);
    if (from === to) return;

    setItems((current) => {
      const source = [...(current[from] ?? [])];
      const dest = [...(current[to] ?? [])];
      const fromIndex = source.indexOf(String(active.id));
      if (fromIndex < 0) return current;
      const overIndex = dest.indexOf(String(over.id));
      const [moved] = source.splice(fromIndex, 1);
      dest.splice(overIndex < 0 ? dest.length : overIndex, 0, moved);
      return { ...current, [from]: source, [to]: dest };
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    draggingRef.current = false;
    setActiveId(null);
    setOverColumnId(null);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 50);

    const currentItems = itemsRef.current;
    if (!over) {
      setItems(buildItems(columns, tasks, visibleTaskIds));
      return;
    }

    const from = findContainer(active.id, currentItems);
    const to = findContainer(over.id, currentItems);
    if (!from || !to) return;

    let nextItems = currentItems;
    if (from === to) {
      const list = [...(currentItems[to] ?? [])];
      const oldIndex = list.indexOf(String(active.id));
      const newIndex = list.indexOf(String(over.id));
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        nextItems = { ...currentItems, [to]: arrayMove(list, oldIndex, newIndex) };
        setItems(nextItems);
      }
    }

    const visibleOrder = nextItems[to] ?? [];
    const hidden = tasks
      .filter((task) => task.columnId === to && !visibleOrder.includes(task.id) && task.id !== String(active.id))
      .sort((a, b) => a.position - b.position)
      .map((task) => task.id);
    const orderedIds = [...visibleOrder, ...hidden];
    try {
      await onMove(String(active.id), to, orderedIds);
    } catch {
      setItems(buildItems(columns, tasks, visibleTaskIds));
    }
  }

  return (
    <DndContext
      sensors={disabled ? [] : liveSensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(event) => void onDragEnd(event)}
      onDragCancel={() => {
        draggingRef.current = false;
        setActiveId(null);
        setOverColumnId(null);
        setItems(buildItems(columns, tasks, visibleTaskIds));
      }}
    >
      <div className="flex min-h-[520px] overflow-x-auto pb-4" style={{ gap: "var(--cc-space-md)" }}>
        {columns.map((column, columnIndex) => (
          <DropColumn
            key={column.id}
            column={column}
            columnIndex={columnIndex}
            boot={booting}
            taskIds={items[column.id] ?? []}
            tasksById={tasksById}
            isOver={overColumnId === column.id}
            disabled={disabled}
            onOpen={onOpenTask}
            onLabelClick={onLabelClick}
            suppressClick={suppressClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[260px] rotate-1 cursor-grabbing">
            <TaskCard task={activeTask} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
