import { useState } from "react";
import { HudButton } from "./HudButton";
import { HudFileUpload, type HudFileUploadState } from "./HudFileUpload";
import { HudModal } from "./HudModal";

type Props = {
  title: string;
  description: string;
  exportLabel?: string;
  importLabel?: string;
  filenamePrefix?: string;
  confirmMessage?: string;
  showMode?: boolean;
  onExport: () => Promise<unknown>;
  onImport: (payload: unknown, mode: "merge" | "replace") => Promise<void>;
};

export function ExportImportDialog({
  title,
  description,
  exportLabel = "Export",
  importLabel = "Restore",
  filenamePrefix = "commandcenter-export",
  confirmMessage,
  showMode = true,
  onExport,
  onImport,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<HudFileUploadState>("idle");

  async function download() {
    const payload = await onExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function restore() {
    if (!file) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setState("uploading");
    setError(null);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      await onImport(parsed, mode);
      setState("success");
      setOpen(false);
      setFile(null);
      setState("idle");
    } catch (err: unknown) {
      setState("error");
      setError(err instanceof Error ? err.message : "Restore failed. Check the JSON schema.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <HudButton type="button" onClick={() => void download()}>
          {exportLabel}
        </HudButton>
        <HudButton type="button" variant="ghost" onClick={() => setOpen(true)}>
          {importLabel}
        </HudButton>
      </div>
      <HudModal open={open} title={title} onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Merge keeps existing records and upserts matching IDs. Replace deletes current data for this operator first,
            then imports the file. Passwords and API secrets are never included in exports.
          </p>
          {showMode ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} />
                Merge
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
                Replace
              </label>
            </>
          ) : null}
          <HudFileUpload
            accept="application/json,.json"
            file={file}
            state={state}
            error={error}
            onFile={(next) => {
              setFile(next);
              setState("ready");
              setError(null);
            }}
            onClear={() => {
              setFile(null);
              setState("idle");
              setError(null);
            }}
          />
          <HudButton type="button" disabled={!file || state === "uploading"} onClick={() => void restore()}>
            Confirm restore
          </HudButton>
        </div>
      </HudModal>
    </div>
  );
}
