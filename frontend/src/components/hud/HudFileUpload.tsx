import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { HudButton } from "./HudButton";

export type HudFileUploadState = "idle" | "ready" | "uploading" | "success" | "error";

type Props = {
  accept?: string;
  label?: string;
  disabled?: boolean;
  state?: HudFileUploadState;
  error?: string | null;
  file?: File | null;
  onFile: (file: File) => void;
  onClear?: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HudFileUpload({
  accept,
  label = "DROP FILE OR SELECT",
  disabled = false,
  state = "idle",
  error,
  file,
  onFile,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function assign(next: File | undefined) {
    if (!next || disabled) return;
    onFile(next);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    assign(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    assign(event.dataTransfer.files[0]);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  const status =
    state === "uploading"
      ? "UPLOADING"
      : state === "success"
        ? "FILE READY"
        : state === "error"
          ? "UPLOAD FAILED"
          : file
            ? "SELECTED"
            : "STANDBY";

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={onChange} disabled={disabled} />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={onKey}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border px-4 py-5 text-center transition-colors duration-[var(--anim)] ${
          dragOver ? "border-[color:var(--accent)] bg-[color:var(--surface-elevated)]" : "border-[color:var(--border)]"
        } ${disabled ? "opacity-40" : "cursor-pointer hover:border-[color:var(--accent)]"}`}
      >
        <div className="font-display text-[10px] tracking-[0.22em] text-[color:var(--accent)] uppercase">{label}</div>
        <div className="mt-2 font-display text-[10px] tracking-[0.16em] text-text-muted uppercase">{status}</div>
        {file ? (
          <div className="mt-3 text-sm text-text-primary">
            {file.name}
            <span className="ml-2 text-text-muted">{formatSize(file.size)}</span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Drag a file here or press Enter to browse.</p>
        )}
      </div>
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      {file && onClear ? (
        <HudButton type="button" variant="ghost" onClick={onClear}>
          Remove file
        </HudButton>
      ) : null}
    </div>
  );
}
