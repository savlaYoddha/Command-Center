import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Props = LinkProps & {
  children: ReactNode;
};

export function HudLink({ children, className = "", onClick, ...props }: Props) {
  return (
    <Link
      className={`font-display tracking-[0.14em] text-[color:var(--link)] underline-offset-2 hover:underline ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
