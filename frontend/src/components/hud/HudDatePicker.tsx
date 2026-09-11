import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { HudButton } from "./HudButton";
import { IconButton } from "./IconButton";

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toStamp(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseStamp(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startGrid(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const day = first.getDay();
  const offset = day === 0 ? 6 : day - 1;
  first.setDate(first.getDate() - offset);
  return first;
}

type Props = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
};

export function HudDatePicker({ label, value, onChange, id }: Props) {
  const [open, setOpen] = useState(false);
  const parsed = parseStamp(value);
  const [cursor, setCursor] = useState(() => parsed ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (parsed) setCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startGrid(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const today = toStamp(new Date());
  const display = parsed
    ? parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "SELECT DATE";

  return (
    <div ref={rootRef} className="relative">
      {label ? (
        <span className="mb-1 block font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">{label}</span>
      ) : null}
      <button
        id={id}
        type="button"
        className="flex w-full items-center justify-between gap-2 border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 text-left text-sm text-text-primary outline-none focus:border-[color:var(--focus)]"
        style={{ minHeight: "var(--cc-control-height)" }}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "" : "text-text-muted"}>{display}</span>
        <CalendarDays size={16} className="text-[color:var(--icon)]" />
      </button>
      {open ? (
        <div
          className="absolute z-[var(--cc-z-overlay)] mt-1 w-[280px] border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-3 shadow-hud"
          role="dialog"
          aria-label={label ?? "Choose date"}
        >
          <div className="mb-2 flex items-center justify-between">
            <IconButton
              label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft size={14} />
            </IconButton>
            <div className="font-display text-[11px] tracking-[0.16em] uppercase">
              {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <IconButton
              label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight size={14} />
            </IconButton>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center font-display text-[8px] tracking-[0.12em] text-text-muted">
                {day}
              </div>
            ))}
            {days.map((date) => {
              const stamp = toStamp(date);
              const outside = date.getMonth() !== cursor.getMonth();
              const selected = stamp === value;
              const isToday = stamp === today;
              return (
                <button
                  key={stamp + String(outside)}
                  type="button"
                  className={`h-8 border font-display text-[11px] ${
                    selected
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--bg-primary)]"
                      : isToday
                        ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                        : "border-transparent text-text-primary hover:border-[color:var(--border)]"
                  } ${outside ? "opacity-35" : ""}`}
                  onClick={() => {
                    onChange(stamp);
                    setOpen(false);
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between gap-2">
            <HudButton
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
            >
              Today
            </HudButton>
            <HudButton
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Clear
            </HudButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
