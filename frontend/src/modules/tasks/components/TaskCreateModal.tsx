import { useState, type FormEvent } from "react";
import { HudButton, HudDatePicker, HudInput, HudModal, HudSelect, HudTextarea, LabelBadge } from "@/components/ui";
import type { BoardColumn, TaskLabel, TaskPriority } from "../types";

type Props = {
  open: boolean;
  columns: BoardColumn[];
  labels: TaskLabel[];
  onClose: () => void;
  onCreate: (input: {
    title: string;
    description: string;
    columnId: string;
    priority: TaskPriority;
    labelIds: string[];
    startDate: string | null;
    dueDate: string | null;
  }) => Promise<void>;
};

export function TaskCreateModal({ open, columns, labels, onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [columnId, setColumnId] = useState(columns[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onCreate({
        title,
        description,
        columnId: columnId || columns[0]?.id,
        priority,
        labelIds,
        startDate: startDate || null,
        dueDate: dueDate || null,
      });
      setTitle("");
      setDescription("");
      setLabelIds([]);
      setStartDate("");
      setDueDate("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <HudModal open={open} title="New task" onClose={onClose}>
      <form className="space-y-3" onSubmit={onSubmit}>
        <HudInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <HudTextarea label="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        <HudSelect label="Column" value={columnId || columns[0]?.id} onChange={(e) => setColumnId(e.target.value)}>
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </HudSelect>
        <HudSelect label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </HudSelect>
        <div>
          <div className="mb-1 font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Labels</div>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const active = labelIds.includes(label.id);
              return (
                <LabelBadge
                  key={label.id}
                  color={active ? label.color : "var(--cc-text-muted)"}
                  onClick={() =>
                    setLabelIds((current) =>
                      current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id],
                    )
                  }
                >
                  {label.name}
                </LabelBadge>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <HudDatePicker label="Start date" value={startDate || null} onChange={(value) => setStartDate(value ?? "")} />
          <HudDatePicker label="Due date" value={dueDate || null} onChange={(value) => setDueDate(value ?? "")} />
        </div>
        {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
        <HudButton type="submit" disabled={pending} className="w-full">
          {pending ? "Creating" : "Create task"}
        </HudButton>
      </form>
    </HudModal>
  );
}
