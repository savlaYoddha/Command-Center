import type { ReactNode } from "react";

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center border border-[color:var(--border)] bg-[color:var(--surface)] font-display text-[10px] tracking-[0.12em] text-[color:var(--accent)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AvatarGroup({ names, max = 4 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;
  return (
    <div className="flex -space-x-2">
      {visible.map((name) => (
        <Avatar key={name} name={name} size={32} />
      ))}
      {overflow > 0 ? (
        <span className="inline-flex h-8 w-8 items-center justify-center border border-[color:var(--border)] bg-[color:var(--bg-secondary)] text-[10px] text-text-muted">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

export function FileList({
  files,
  onRemove,
}: {
  files: Array<{ id: string; name: string; size: string; meta?: string }>;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-[color:var(--border)] border border-[color:var(--border)]">
      {files.map((file) => (
        <div key={file.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <div>
            <div>{file.name}</div>
            {file.meta ? <div className="text-xs text-text-muted">{file.meta}</div> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">{file.size}</span>
            {onRemove ? (
              <button type="button" className="text-xs text-[color:var(--danger)]" onClick={() => onRemove(file.id)}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttachmentCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <div className="font-display text-[10px] tracking-[0.18em] text-text-muted uppercase">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
