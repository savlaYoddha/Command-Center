import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityItem,
  CheckboxControl,
  ConfirmDialog,
  HudButton,
  HudDatePicker,
  HudFileUpload,
  HudInput,
  HudLink,
  HudSelect,
  HudTextarea,
  LabelBadge,
  SectionHeader,
} from "@/components/ui";
import { notify } from "@/store/toastStore";
import { taskApi } from "../services/tasks";
import type { ActivityRow, BoardColumn, TaskDetail, TaskLabel, TaskPriority } from "../types";
import type { HudFileUploadState } from "@/components/hud/HudFileUpload";

type Props = {
  lookup: string;
  columns: BoardColumn[];
  labels: TaskLabel[];
  onDeleted: () => void;
  onChanged: () => Promise<void>;
  extraActions?: ReactNode;
};

export function TaskRecord({ lookup, columns, labels, onDeleted, onChanged, extraActions }: Props) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [checkText, setCheckText] = useState("");
  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<HudFileUploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function reload() {
    const [next, history] = await Promise.all([taskApi.task(lookup), taskApi.activity(lookup)]);
    setDetail(next);
    setActivity(history as ActivityRow[]);
    await onChanged();
  }

  useEffect(() => {
    setError(null);
    void reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Unable to load task."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup]);

  async function patch(body: Record<string, unknown>) {
    setDetail(await taskApi.updateTask(lookup, body));
    await reload();
  }

  if (!detail) {
    return <p className="text-sm text-text-muted">{error ?? "Syncing task record…"}</p>;
  }

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <div>
        <div className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Task ID</div>
        <HudLink to={`/tasks/${detail.number}`} className="text-lg no-underline">
          {detail.number}
        </HudLink>
        <div className="mt-1 break-all text-[11px] text-text-secondary">/tasks/{detail.number}</div>
      </div>
      {extraActions}
      <HudInput
        label="Title"
        value={detail.title}
        onChange={(e) => setDetail({ ...detail, title: e.target.value })}
        onBlur={() => void patch({ title: detail.title })}
      />

      <HudSelect label="Status" value={detail.columnId} onChange={(e) => void patch({ columnId: e.target.value })}>
        {columns.map((col) => (
          <option key={col.id} value={col.id}>
            {col.name}
          </option>
        ))}
      </HudSelect>

      <HudSelect
        label="Priority"
        value={detail.priority}
        onChange={(e) => void patch({ priority: e.target.value as TaskPriority })}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </HudSelect>

      <div>
        <SectionHeader title="Labels" />
        <div className="flex flex-wrap gap-2">
          {detail.labels.map((label) => (
            <LabelBadge
              key={label.id}
              color={label.color}
              onClick={() => void taskApi.removeLabel(detail.id, label.id).then(reload)}
            >
              {label.name} ×
            </LabelBadge>
          ))}
        </div>
        <HudSelect
          label="Add label"
          value=""
          onChange={(e) => {
            if (e.target.value) void taskApi.addLabel(detail.id, e.target.value).then(reload);
          }}
        >
          <option value="">Select</option>
          {labels
            .filter((label) => !detail.labels.some((item) => item.id === label.id))
            .map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
        </HudSelect>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <HudDatePicker label="Start date" value={detail.startDate} onChange={(value) => void patch({ startDate: value })} />
        <HudDatePicker label="Due date" value={detail.dueDate} onChange={(value) => void patch({ dueDate: value })} />
      </div>

      <HudTextarea
        label="Description"
        rows={6}
        value={detail.description}
        onChange={(e) => setDetail({ ...detail, description: e.target.value })}
        onBlur={() => void patch({ description: detail.description })}
      />

      <div>
        <SectionHeader title="Checklist" />
        <div className="space-y-2">
          {detail.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <CheckboxControl
                aria-label={`Mark ${item.text} completed`}
                checked={item.completed === 1}
                onChange={(checked) => void taskApi.patchChecklist(item.id, { completed: checked }).then(reload)}
              />
              <span className={item.completed ? "text-text-muted line-through" : ""}>{item.text}</span>
              <button
                type="button"
                className="ml-auto text-[10px] text-[color:var(--danger)]"
                onClick={() => void taskApi.deleteChecklist(item.id).then(reload)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <HudInput
            label="Checklist item"
            value={checkText}
            onChange={(e) => setCheckText(e.target.value)}
            placeholder="Add checklist item"
          />
          <HudButton
            type="button"
            variant="ghost"
            onClick={() => {
              if (!checkText.trim()) return;
              void taskApi.addChecklist(detail.id, checkText.trim()).then(() => {
                setCheckText("");
                return reload();
              });
            }}
          >
            Add
          </HudButton>
        </div>
      </div>

      <div>
        <SectionHeader title="Comments" />
        <div className="space-y-3">
          {detail.comments.map((item) => (
            <div key={item.id} className="border-b border-[color:var(--border)] pb-2">
              {editingComment === item.id ? (
                <HudTextarea
                  label="Edit comment"
                  defaultValue={item.content}
                  rows={3}
                  onBlur={(e) => {
                    void taskApi.updateComment(item.id, e.target.value).then(() => {
                      setEditingComment(null);
                      return reload();
                    });
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{item.content}</p>
              )}
              <div className="mt-1 flex gap-2 text-[10px] text-text-muted">
                <span>{new Date(item.createdAt).toLocaleString()}</span>
                <button type="button" onClick={() => setEditingComment(item.id)}>
                  Edit
                </button>
                <button type="button" onClick={() => void taskApi.deleteComment(item.id).then(reload)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <HudInput
            label="New comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add comment"
          />
          <HudButton
            type="button"
            onClick={() => {
              if (!comment.trim()) return;
              void taskApi.addComment(detail.id, comment.trim()).then(() => {
                setComment("");
                return reload();
              });
            }}
          >
            Post
          </HudButton>
        </div>
      </div>

      <div>
        <SectionHeader title="Attachments" />
        <div className="space-y-2">
          {detail.attachments.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <a
                className="text-[color:var(--accent)] underline"
                href={`/api/v1/attachments/${item.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {item.originalName}
              </a>
              <button
                type="button"
                className="text-[10px] text-[color:var(--danger)]"
                onClick={() => void taskApi.deleteAttachment(item.id).then(reload)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <HudFileUpload
            file={file}
            state={uploadState}
            error={uploadError}
            onFile={(next) => {
              setFile(next);
              setUploadState("uploading");
              setUploadError(null);
              void taskApi
                .upload(detail.id, next)
                .then(() => {
                  setUploadState("success");
                  setFile(null);
                  return reload();
                })
                .catch((err: unknown) => {
                  setUploadState("error");
                  setUploadError(err instanceof Error ? err.message : "Upload failed.");
                });
            }}
            onClear={() => {
              setFile(null);
              setUploadState("idle");
              setUploadError(null);
            }}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="Activity" />
        {activity.map((item) => (
          <ActivityItem key={item.id} summary={item.summary} module={item.action} createdAt={item.createdAt} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {detail.deletedAt ? (
          <HudButton
            type="button"
            onClick={() => {
              void taskApi.restoreTask(detail.id).then(() => {
                notify("success", "TASK RESTORED", detail.number);
                onDeleted();
                return onChanged();
              });
            }}
          >
            Restore from recycle bin
          </HudButton>
        ) : (
          <>
            {detail.archived !== 1 ? (
              <HudButton type="button" variant="ghost" onClick={() => setConfirmArchive(true)}>
                Archive task
              </HudButton>
            ) : null}
            <HudButton variant="danger" type="button" onClick={() => setConfirmDelete(true)}>
              Move to recycle bin
            </HudButton>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmArchive}
        title="Archive task?"
        confirmLabel="Archive"
        body={<p>This task will be removed from the active board but retained in the archive.</p>}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          void taskApi.archiveTask(detail.id).then(() => {
            setConfirmArchive(false);
            notify("success", "TASK ARCHIVED", detail.number);
            onDeleted();
            return onChanged();
          });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Move to recycle bin?"
        danger
        confirmLabel="Move to recycle bin"
        body={<p>{detail.number} will leave the active board. Restore it later from Recycle Bin, or delete it permanently there.</p>}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          void taskApi.deleteTask(detail.id).then(() => {
            setConfirmDelete(false);
            notify("warning", "MOVED TO RECYCLE BIN", detail.number);
            onDeleted();
            return onChanged();
          });
        }}
      />
    </div>
  );
}
