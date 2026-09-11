import { useNavigate } from "react-router-dom";
import { HudButton, HudDrawer } from "@/components/ui";
import { TaskRecord } from "./TaskRecord";
import type { BoardColumn, TaskLabel } from "../types";

type Props = {
  taskId: string | null;
  taskNumber?: string;
  columns: BoardColumn[];
  labels: TaskLabel[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

export function TaskDrawer({ taskId, taskNumber, columns, labels, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const lookup = taskId ?? taskNumber ?? null;
  if (!lookup) return null;

  return (
    <HudDrawer open={Boolean(lookup)} title={taskNumber ?? "Task"} onClose={onClose} wide>
      <TaskRecord
        lookup={lookup}
        columns={columns}
        labels={labels}
        onDeleted={onClose}
        onChanged={onChanged}
        extraActions={
          taskNumber ? (
            <HudButton
              type="button"
              variant="ghost"
              onClick={() => navigate(`/tasks/${taskNumber}`, { replace: true, state: {} })}
            >
              Open full screen
            </HudButton>
          ) : null
        }
      />
    </HudDrawer>
  );
}
