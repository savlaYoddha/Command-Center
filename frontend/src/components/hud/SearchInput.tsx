import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className = "", ...props }: Props) {
  return (
    <label className="relative flex min-w-[180px] flex-1 items-center">
      <Search size={14} className="pointer-events-none absolute left-3 text-[color:var(--icon)]" />
      <span className="sr-only">{props["aria-label"] ?? "Search"}</span>
      <input
        className={`w-full border border-[color:var(--border)] bg-[color:var(--input-bg)] py-1.5 pr-3 pl-9 text-sm outline-none focus:border-[color:var(--focus)] ${className}`}
        {...props}
      />
    </label>
  );
}
