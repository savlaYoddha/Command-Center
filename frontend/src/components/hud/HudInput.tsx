import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function HudInput({ label, className = "", id, ...props }: Props) {
  return (
    <label className="block space-y-1" htmlFor={id}>
      {label ? (
        <span className="font-display text-[10px] tracking-[0.22em] text-text-muted uppercase">{label}</span>
      ) : null}
      <input
        id={id}
        className={`w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 text-sm text-text-primary outline-none transition-colors duration-[var(--anim)] focus:border-[color:var(--focus)] ${className}`}
        style={{ minHeight: "var(--cc-control-height)" }}
        {...props}
      />
    </label>
  );
}
