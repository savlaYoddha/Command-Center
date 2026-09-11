import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({ label, children, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`border border-[color:var(--border)] p-2 text-[color:var(--icon)] transition-colors duration-[var(--anim)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
