import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
};

export function HudButton({ children, variant = "primary", className = "", ...props }: Props) {
  const styles = {
    primary:
      "border-[color:var(--accent)] text-[color:var(--bg-primary)] bg-[color:var(--accent)] hover:shadow-glow",
    ghost: "border-[color:var(--border)] text-[color:var(--text-primary)] hover:border-[color:var(--accent)]",
    danger: "border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10",
  }[variant];

  return (
    <button
      className={`clip-hud border px-4 font-display text-[11px] tracking-[0.18em] uppercase transition-all duration-[var(--anim)] disabled:opacity-40 ${styles} ${className}`}
      {...props}
      style={{ minHeight: "var(--cc-control-height)", ...props.style }}
    >
      {children}
    </button>
  );
}
