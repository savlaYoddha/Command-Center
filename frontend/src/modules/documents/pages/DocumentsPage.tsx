import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CheckSquare,
  Download,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Mail,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/hud/PageHeader";
import { HudButton } from "@/components/hud/HudButton";
import { HudModal } from "@/components/hud/HudModal";
import { HudInput } from "@/components/hud/HudInput";
import { HudSelect } from "@/components/hud/HudSelect";
import { HudFileUpload } from "@/components/hud/HudFileUpload";
import { EmptyState } from "@/components/hud/EmptyState";
import { LoadingState } from "@/components/hud/LoadingState";
import { notify } from "@/store/toastStore";
import { documentService, type DocumentItem } from "@/services/documents";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "government", label: "Government" },
  { value: "financial", label: "Financial" },
  { value: "vehicles", label: "Vehicles" },
  { value: "certificates", label: "Certificates" },
  { value: "other", label: "Other" },
];

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdf(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function DownloadFile({ onClick, label = "DOWNLOAD" }: { onClick: () => void; label?: string }) {
  return (
    <span
      className="inline-flex cursor-pointer items-center gap-1 font-display text-[10px] tracking-[0.18em] uppercase text-[color:var(--accent)] hover:underline"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Download size={12} /> {label}
    </span>
  );
}

function triggerDownload(url: string, fallbackName: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

type UploadMeta = {
  file: File | null;
  name: string;
  folder: string;
  category: string;
  tags: string;
  notes: string;
};

function UploadModal({
  open,
  existingFolders,
  onClose,
  onUpload,
}: {
  open: boolean;
  existingFolders: string[];
  onClose: () => void;
  onUpload: (file: File, meta: UploadMeta) => Promise<void>;
}) {
  const [meta, setMeta] = useState<UploadMeta>({ file: null, name: "", folder: "", category: "other", tags: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMeta({ file: null, name: "", folder: "", category: "other", tags: "", notes: "" });
      setBusy(false);
      setError(null);
    }
  }, [open]);

  function onFile(file: File) {
    setMeta((m) => ({ ...m, file, name: m.name || file.name }));
  }

  async function submit() {
    if (!meta.file) {
      setError("Select a file first.");
      return;
    }
    setBusy(true);
    try {
      await onUpload(meta.file, meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <HudModal open={open} title="Upload document" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <HudFileUpload
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.docx,.xlsx"
          file={meta.file}
          onFile={onFile}
          onClear={() => setMeta((m) => ({ ...m, file: null, name: "" }))}
        />
        {meta.file ? (
          <HudInput
            label="Name"
            value={meta.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMeta((m) => ({ ...m, name: e.target.value }))}
            placeholder={meta.file.name}
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <HudInput
            label="Folder"
            list="cc-doc-folders"
            value={meta.folder}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMeta((m) => ({ ...m, folder: e.target.value }))}
            placeholder="e.g. Pay Slips, Licenses, Aadhar"
          />
          <datalist id="cc-doc-folders">
            {existingFolders.map((folder) => (
              <option key={folder} value={folder} />
            ))}
          </datalist>
          <HudSelect label="Category" value={meta.category} onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </HudSelect>
        </div>
        <HudInput
          label="Tags"
          value={meta.tags}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setMeta((m) => ({ ...m, tags: e.target.value }))}
          placeholder="comma, separated, tags"
        />
        <label className="block space-y-1">
          <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Notes</span>
          <textarea
            value={meta.notes}
            onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))}
            rows={3}
            placeholder="Optional context…"
            className="w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-text-primary outline-none transition-colors duration-[var(--anim)] focus:border-[color:var(--focus)]"
          />
        </label>
        {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <HudButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </HudButton>
          <HudButton type="button" variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Uploading…" : "Upload"}
          </HudButton>
        </div>
      </div>
    </HudModal>
  );
}

function EmailModal({
  open,
  count,
  onClose,
  onSend,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<void>;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTo("");
      setSubject("");
      setBody("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (!to.trim()) {
      setError("Recipient email is required.");
      return;
    }
    setBusy(true);
    try {
      await onSend(to.trim(), subject, body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
      setBusy(false);
    }
  }

  return (
    <HudModal open={open} title={`Email ${count} document${count === 1 ? "" : "s"}`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Recipient email</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="someone@example.com"
            className="w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 text-sm text-text-primary outline-none transition-colors duration-[var(--anim)] focus:border-[color:var(--focus)]"
            style={{ minHeight: "var(--cc-control-height)" }}
          />
        </label>
        <HudInput label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Documents from COMMANDCENTER" />
        <label className="block space-y-1">
          <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="See attached documents."
            className="w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 text-sm text-text-primary outline-none transition-colors duration-[var(--anim)] focus:border-[color:var(--focus)]"
          />
        </label>
        <p className="text-xs text-text-muted">Sent from the server email account configured for this installation.</p>
        {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <HudButton type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </HudButton>
          <HudButton type="button" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send email"}
          </HudButton>
        </div>
      </div>
    </HudModal>
  );
}

export function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentFolder, setCurrentFolder] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setDocs(await documentService.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const folders = useMemo(() => {
    const set = new Set<string>(docs.map((d) => d.folder).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const doc of docs) for (const tag of doc.tags) set.add(tag);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((doc) => {
      if (currentFolder && doc.folder !== currentFolder) return false;
      if (categoryFilter && doc.category !== categoryFilter) return false;
      if (tagFilter && !doc.tags.includes(tagFilter)) return false;
      if (q && !doc.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docs, currentFolder, categoryFilter, tagFilter, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const doc of visible) next.add(doc.id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleUpload(file: File, meta: UploadMeta) {
    await documentService.upload(file, {
      folder: meta.folder,
      category: meta.category,
      name: meta.name,
      tags: meta.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: meta.notes,
    });
    setUploadOpen(false);
    notify("success", "Document uploaded", file.name);
    await load();
  }

  async function handleZip() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const blob = await documentService.zipBlob(ids);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "documents.zip");
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("success", "Download ready", `${ids.length} document${ids.length === 1 ? "" : "s"} zipped`);
    } catch (err) {
      notify("error", "Zip failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(to: string, subject: string, body: string) {
    await documentService.email([...selected], to, subject || undefined, body || undefined);
    setEmailOpen(false);
    notify("success", "Email sent", `Delivered to ${to}`);
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const id of ids) await documentService.remove(id);
      setSelected(new Set());
      setDeleteOpen(false);
      notify("success", "Deleted", `${ids.length} document${ids.length === 1 ? "" : "s"} removed`);
      await load();
    } catch (err) {
      notify("error", "Delete failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="Archive"
        title="Document store"
        actions={
          <div className="flex flex-wrap gap-2">
            <HudButton type="button" variant="ghost" onClick={() => setUploadOpen(true)}>
              <Upload size={14} className="mr-1" /> Upload
            </HudButton>
            <HudButton type="button" variant="ghost" disabled={selected.size === 0 || busy} onClick={() => void handleZip()}>
              <Download size={14} className="mr-1" /> Zip selected
            </HudButton>
            <HudButton type="button" variant="ghost" disabled={selected.size === 0} onClick={() => setEmailOpen(true)}>
              <Mail size={14} className="mr-1" /> Email
            </HudButton>
            <HudButton type="button" variant="danger" disabled={selected.size === 0 || busy} onClick={() => setDeleteOpen(true)}>
              <Trash2 size={14} className="mr-1" /> Delete
            </HudButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--icon)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 pl-9 text-sm text-text-primary outline-none transition-colors duration-[var(--anim)] focus:border-[color:var(--focus)]"
            style={{ minHeight: "var(--cc-control-height)" }}
          />
        </div>
        <HudSelect label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </HudSelect>
        {allTags.length > 0 ? (
          <HudSelect label="Tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </HudSelect>
        ) : null}
        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[color:var(--accent)]">
              {selected.size} selected
            </span>
            <HudButton type="button" variant="ghost" onClick={selectVisible}>
              Select all in view
            </HudButton>
            <HudButton type="button" variant="ghost" onClick={clearSelection}>
              Clear
            </HudButton>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCurrentFolder("")}
          className={`inline-flex items-center gap-1 border px-3 py-1.5 font-display text-[10px] tracking-[0.18em] uppercase transition-colors ${
            currentFolder === ""
              ? "border-[color:var(--accent)] text-[color:var(--accent)]"
              : "border-[color:var(--border)] text-[color:var(--icon)] hover:border-[color:var(--accent)]"
          }`}
        >
          <FolderOpen size={13} /> All documents ({docs.length})
        </button>
        {folders.map((folder) => {
          const count = docs.filter((d) => d.folder === folder).length;
          const active = currentFolder === folder;
          return (
            <button
              key={folder}
              type="button"
              onClick={() => setCurrentFolder(active ? "" : folder)}
              className={`inline-flex items-center gap-1 border px-3 py-1.5 font-display text-[10px] tracking-[0.18em] uppercase transition-colors ${
                active
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-[color:var(--border)] text-[color:var(--icon)] hover:border-[color:var(--accent)]"
              }`}
            >
              <Folder size={13} /> {folder} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState label="LOADING DOCUMENTS…" />
      ) : error ? (
        <EmptyState kicker="System error" title="Unable to load documents" body={error} actionLabel="Retry" onAction={() => void load()} />
      ) : visible.length === 0 ? (
        <EmptyState
          kicker="Archive"
          title={docs.length === 0 ? "Document store empty" : "No documents match the current filter"}
          body={
            docs.length === 0
              ? "Upload identity cards, licences, pay slips and more. Organise with folders, labels and tags, then download or email them."
              : "Adjust the folder, category, tag or search to widen the results."
          }
          actionLabel={docs.length === 0 ? "Upload first document" : undefined}
          onAction={docs.length === 0 ? () => setUploadOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((doc) => {
            const isSelected = selected.has(doc.id);
            return (
              <div
                key={doc.id}
                className={`relative border p-4 transition-colors ${
                  isSelected ? "border-[color:var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_10%,transparent)]" : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
                }`}
              >
                <button
                  type="button"
                  aria-label={isSelected ? "Deselect" : "Select"}
                  className="absolute left-3 top-3 text-[color:var(--icon)] hover:text-[color:var(--accent)]"
                  onClick={() => toggleSelect(doc.id)}
                >
                  {isSelected ? <CheckSquare size={16} className="text-[color:var(--accent)]" /> : <Square size={16} />}
                </button>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-2 py-2 text-[color:var(--accent)]"
                  onClick={() => setPreview(doc)}
                  aria-label={`Preview ${doc.name}`}
                >
                  {isImage(doc.mimeType) ? <ImageIcon size={34} /> : <FileText size={34} />}
                </button>
                <button
                  type="button"
                  className="mt-1 w-full text-center font-display text-xs tracking-[0.12em] lowercase text-text-primary hover:text-[color:var(--accent)]"
                  title="Preview"
                  onClick={() => setPreview(doc)}
                >
                  {doc.name}
                </button>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="border border-[color:var(--border)] px-1.5 py-0.5 font-display text-[9px] tracking-[0.16em] uppercase text-text-muted">
                    {categoryLabel(doc.category)}
                  </span>
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-[color:var(--border)] px-1.5 py-0.5 font-display text-[9px] tracking-[0.16em] uppercase text-[color:var(--accent)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                  <span>{formatBytes(doc.size)}</span>
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
                {doc.folder ? (
                  <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-text-secondary">
                    <Folder size={11} /> {doc.folder}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-center gap-3">
                  <DownloadFile onClick={() => triggerDownload(documentService.downloadUrl(doc.id), doc.name)} />
                  <span className="text-text-muted">·</span>
                  <span
                    className="inline-flex cursor-pointer items-center gap-1 font-display text-[10px] tracking-[0.18em] uppercase text-text-secondary hover:text-[color:var(--accent)]"
                    onClick={() => setPreview(doc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreview(doc);
                      }
                    }}
                  >
                    {isPdf(doc.mimeType) || isImage(doc.mimeType) ? "Preview" : "Details"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadModal open={uploadOpen} existingFolders={folders} onClose={() => setUploadOpen(false)} onUpload={handleUpload} />

      {deleteOpen ? (
        <HudModal open onClose={() => !busy && setDeleteOpen(false)} title={`Delete ${selected.size} document${selected.size === 1 ? "" : "s"}?`}>
          <p className="text-sm text-text-secondary">
            This permanently removes the selected files from the server. This action cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <HudButton type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={busy}>
              Cancel
            </HudButton>
            <HudButton type="button" variant="danger" onClick={() => void handleDeleteSelected()} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </HudButton>
          </div>
        </HudModal>
      ) : null}

      {preview ? (
        <HudModal open onClose={() => setPreview(null)} title={preview.name} size="lg">
          <div className="space-y-4">
            {isImage(preview.mimeType) ? (
              <img src={documentService.fileUrl(preview.id)} alt={preview.name} className="mx-auto max-h-[60vh] w-auto border border-[color:var(--border)]" />
            ) : isPdf(preview.mimeType) ? (
              <iframe src={documentService.fileUrl(preview.id)} title={preview.name} className="h-[60vh] w-full border border-[color:var(--border)] bg-white" />
            ) : (
              <EmptyState
                kicker="No inline preview"
                title="Preview not supported"
                body={`${preview.name} (${preview.mimeType}) cannot be previewed in the browser. Download it to view the file.`}
                actionLabel="Download file"
                onAction={() => triggerDownload(documentService.downloadUrl(preview.id), preview.name)}
              />
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <span className="border border-[color:var(--border)] px-1.5 py-0.5 font-display tracking-[0.14em] uppercase">
                {categoryLabel(preview.category)}
              </span>
              {preview.folder ? (
                <span className="inline-flex items-center gap-1">
                  <Folder size={11} /> {preview.folder}
                </span>
              ) : null}
              <span>{formatBytes(preview.size)}</span>
              <span>{formatDate(preview.createdAt)}</span>
              {preview.tags.map((tag) => (
                <span key={tag} className="text-[color:var(--accent)]">
                  #{tag}
                </span>
              ))}
            </div>
            {preview.notes ? <p className="text-sm text-text-secondary">{preview.notes}</p> : null}
            <div className="flex justify-end gap-2">
              <HudButton type="button" variant="ghost" onClick={() => setPreview(null)}>
                <X size={14} className="mr-1" /> Close
              </HudButton>
              <HudButton type="button" onClick={() => triggerDownload(documentService.downloadUrl(preview.id), preview.name)}>
                <Download size={14} className="mr-1" /> Download
              </HudButton>
            </div>
          </div>
        </HudModal>
      ) : null}

      {emailOpen ? (
        <EmailModal open count={selected.size} onClose={() => setEmailOpen(false)} onSend={handleEmail} />
      ) : null}
    </div>
  );
}