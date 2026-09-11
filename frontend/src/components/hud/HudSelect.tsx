import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

type OptionItem = { value: string; label: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: string;
  children: React.ReactNode;
};

function parseOptions(children: React.ReactNode): OptionItem[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const el = child as ReactElement<{ value?: string; children?: React.ReactNode }>;
      const value = String(el.props.value ?? el.props.children ?? "");
      const label = String(el.props.children ?? el.props.value ?? "");
      return { value, label };
    });
}

export function HudSelect({ label, className = "", children, id, value, defaultValue, onChange, disabled }: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const listId = `${selectId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => parseOptions(children), [children]);
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : internal;
  const selected = options.find((opt) => opt.value === current) ?? options[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.({ target: { value: next } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative block space-y-1 ${className}`}>
      {label ? (
        <span id={`${selectId}-label`} className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        className="cc-hud-select-trigger flex w-full items-center justify-between gap-2 border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 text-left text-sm text-[color:var(--text-primary)] outline-none transition-colors duration-[var(--anim)] hover:border-[color:var(--accent)] focus-visible:border-[color:var(--accent)] focus-visible:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_55%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ minHeight: "var(--cc-control-height)" }}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown" && !open) setOpen(true);
        }}
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <ChevronDown size={14} className={`shrink-0 text-[color:var(--icon)] transition-transform duration-[var(--anim)] ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
          className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto border border-[color:var(--accent)] bg-[color:var(--surface-elevated)] py-1 shadow-hud"
        >
          {options.map((opt) => {
            const active = opt.value === current;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors duration-[var(--anim)] ${
                    active
                      ? "bg-[color:color-mix(in_srgb,var(--accent)_18%,var(--surface-elevated))] text-[color:var(--accent)]"
                      : "text-text-primary hover:bg-[color:color-mix(in_srgb,var(--accent)_10%,var(--surface-elevated))] hover:text-[color:var(--accent)]"
                  }`}
                  onClick={() => pick(opt.value)}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <select
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        value={current}
        onChange={(e) => pick(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
    </div>
  );
}
