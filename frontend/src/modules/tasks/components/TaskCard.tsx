import { CommandPanel, HudLink, LabelBadge } from "@/components/ui";
import { MessageSquare, Paperclip } from "lucide-react";
import type { TaskCardModel } from "../types";

const priorityTone: Record<string, string> = {
  urgent: "var(--priority-urgent)",
  high: "var(--priority-high)",
  medium: "var(--priority-medium)",
  low: "var(--priority-low)",
};

function formatDue(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" }).toUpperCase();
}

type Props = {
  task: TaskCardModel;
  dragging?: boolean;
  onLabelClick?: (labelId: string) => void;
};

export function TaskCard({ task, dragging = false, onLabelClick }: Props) {
  return (
    <CommandPanel
      highlighted={dragging}
      className={`p-[var(--cc-panel-padding)] transition-shadow duration-[var(--anim)] ${dragging ? "" : "hover:shadow-hud"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <HudLink
          to={`/tasks/${task.number}`}
          className="font-display text-[10px] tracking-[0.16em] no-underline"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {task.number}
        </HudLink>
        <span
          className="font-display text-[9px] tracking-[0.16em] uppercase"
        style={{ color: priorityTone[task.priority] ?? "var(--priority-medium)" }}
        >
          {task.priority}
        </span>
      </div>
      <div className="mt-2 text-sm leading-snug text-text-primary">{task.title}</div>
      {task.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelBadge
              key={label.id}
              color={label.color}
              onClick={onLabelClick ? () => onLabelClick(label.id) : undefined}
            >
              {label.name}
            </LabelBadge>
          ))}
        </div>
      ) : null}
      {task.dueDate ? (
        <div className="mt-2 font-display text-[9px] tracking-[0.14em] text-text-secondary">DUE: {formatDue(task.dueDate)}</div>
      ) : null}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
        {task.checklistTotal > 0 ? (
          <span>
            Checklist {task.checklistDone}/{task.checklistTotal}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MessageSquare size={11} /> {task.commentCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <Paperclip size={11} /> {task.attachmentCount}
        </span>
      </div>
    </CommandPanel>
  );
}
