import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CommandPanel, EmptyState, HudBackButton, LoadingState, PageHeader } from "@/components/ui";
import { TaskRecord } from "../components/TaskRecord";
import { taskApi } from "../services/tasks";
import type { BoardColumn, TaskLabel } from "../types";

export function TaskPage() {
  const { taskNumber } = useParams();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([taskApi.columns(), taskApi.labels()])
      .then(([nextColumns, nextLabels]) => {
        setColumns(nextColumns);
        setLabels(nextLabels);
        setReady(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load task."));
  }, []);

  if (!taskNumber) return null;
  if (!ready && !error) return <LoadingState label="LOADING TASK RECORD..." />;
  if (error) {
    return (
      <EmptyState
        kicker="Task system"
        title="TASK DATABASE OFFLINE"
        body={error}
        actionLabel="Back to tasks"
        onAction={() => navigate("/tasks")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Task record"
        title={taskNumber.toUpperCase()}
        actions={<HudBackButton label="BACK TO TASKS" to="/tasks" />}
      />
      <CommandPanel className="p-5" hatch>
        <TaskRecord
          lookup={taskNumber}
          columns={columns}
          labels={labels}
          onDeleted={() => navigate("/tasks")}
          onChanged={async () => undefined}
        />
      </CommandPanel>
    </div>
  );
}
