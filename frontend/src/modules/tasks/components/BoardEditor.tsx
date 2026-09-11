import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  ConfirmDialog,
  HudButton,
  HudInput,
  HudModal,
  HudSelect,
  HudTextarea,
} from "@/components/ui";
import type { BoardColumn } from "../types";

type Props = {
  open: boolean;
  columns: BoardColumn[];
  taskCounts: Record<string, number>;
  onClose: () => void;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onCreate: (name: string, description: string) => Promise<void>;
  onRename: (id: string, name: string, description: string) => Promise<void>;
  onDelete: (id: string, destinationColumnId?: string) => Promise<void>;
};

function SortableColumnRow({
  column,
  count,
  canDelete,
  onEdit,
  onDelete,
}: {
  column: BoardColumn;
  count: number;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border border-[color:var(--border)] bg-[color:var(--bg-primary)] px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-text-muted"
        aria-label={`Reorder ${column.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[11px] tracking-[0.16em] uppercase">{column.name}</div>
        <div className="truncate text-[11px] text-text-muted">
          {count} tasks{column.description ? ` · ${column.description}` : ""}
        </div>
      </div>
      <HudButton variant="ghost" type="button" onClick={onEdit}>
        Edit
      </HudButton>
      <HudButton variant="danger" type="button" disabled={!canDelete} onClick={onDelete}>
        Delete
      </HudButton>
    </div>
  );
}

export function BoardEditor({
  open,
  columns,
  taskCounts,
  onClose,
  onReorder,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [order, setOrder] = useState(columns.map((col) => col.id));
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) {
      setAddOpen(false);
      setEditId(null);
      setDeleteId(null);
      setName("");
      setDescription("");
      return;
    }
    setOrder(columns.map((col) => col.id));
  }, [open, columns]);

  const orderedColumns = order
    .map((id) => columns.find((col) => col.id === id))
    .filter((col): col is BoardColumn => Boolean(col));

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    await onReorder(next);
  }

  const editing = columns.find((col) => col.id === editId);
  const deleting = columns.find((col) => col.id === deleteId);
  const deleteCount = deleteId ? (taskCounts[deleteId] ?? 0) : 0;

  return (
    <>
      <HudModal open={open} title="Board configuration" onClose={onClose} size="lg">
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedColumns.map((column) => (
                  <SortableColumnRow
                    key={column.id}
                    column={column}
                    count={taskCounts[column.id] ?? 0}
                    canDelete={columns.length > 1}
                    onEdit={() => {
                      setEditId(column.id);
                      setName(column.name);
                      setDescription(column.description ?? "");
                    }}
                    onDelete={() => {
                      setDeleteId(column.id);
                      setDestinationId(columns.find((col) => col.id !== column.id)?.id ?? "");
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex flex-wrap justify-between gap-2">
            <HudButton type="button" variant="ghost" onClick={() => { setAddOpen(true); setName(""); setDescription(""); }}>
              + Add column
            </HudButton>
            <HudButton type="button" onClick={onClose}>
              Done
            </HudButton>
          </div>
        </div>
      </HudModal>

      <HudModal open={addOpen} title="Add column" nested onClose={() => setAddOpen(false)}>
        <div className="space-y-3">
          <HudInput label="Column name" value={name} onChange={(e) => setName(e.target.value)} />
          <HudTextarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <HudButton
            type="button"
            className="w-full"
            onClick={() => {
              if (!name.trim()) return;
              void onCreate(name.trim(), description.trim()).then(() => setAddOpen(false));
            }}
          >
            Save
          </HudButton>
        </div>
      </HudModal>

      <HudModal open={Boolean(editing)} title="Rename column" nested onClose={() => setEditId(null)}>
        <div className="space-y-3">
          <HudInput label="Column name" value={name} onChange={(e) => setName(e.target.value)} />
          <HudTextarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <HudButton
            type="button"
            className="w-full"
            onClick={() => {
              if (!editId || !name.trim()) return;
              void onRename(editId, name.trim(), description.trim()).then(() => setEditId(null));
            }}
          >
            Save
          </HudButton>
        </div>
      </HudModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete column"
        danger
        confirmLabel="Delete"
        confirmDisabled={deleteCount > 0 && !destinationId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          if (deleteCount > 0 && !destinationId) return;
          void onDelete(deleteId, deleteCount > 0 ? destinationId : undefined).then(() => setDeleteId(null));
        }}
        body={
          deleting ? (
            <div className="space-y-3">
              <p>Are you sure you want to delete {deleting.name}?</p>
              {deleteCount > 0 ? (
                <>
                  <p>This column contains {deleteCount} tasks. Move them to:</p>
                  <HudSelect value={destinationId} onChange={(e) => setDestinationId(e.target.value)} label="Destination column">
                    {columns
                      .filter((col) => col.id !== deleting.id)
                      .map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                  </HudSelect>
                </>
              ) : (
                <p>This column is empty. Tasks will not be deleted.</p>
              )}
            </div>
          ) : null
        }
      />
    </>
  );
}
