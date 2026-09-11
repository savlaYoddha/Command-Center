import { createPortal } from "react-dom";
import { useCallback, useRef, type ReactNode } from "react";
import { HudButton } from "./HudButton";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
};

export function HudDrawer({ open, title, children, onClose, wide = false }: Props) {
  const panelRef = useRef<HTMLElement | null>(null);
  const onEscape = useCallback(() => {
    if (open) onClose();
  }, [open, onClose]);
  useFocusTrap(open, panelRef, onEscape);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${open ? "" : "pointer-events-none"}`}
      style={{ zIndex: "var(--cc-z-modal)" }}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-[var(--anim)] ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-label="Close drawer"
        tabIndex={open ? 0 : -1}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-drawer-title"
        className={`absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-[color:var(--border)] bg-[color:var(--drawer-bg)] p-5 transition-transform duration-[var(--anim)] ${
          wide ? "md:w-[520px]" : "md:max-w-md md:w-[420px]"
        } ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="hud-drawer-title" className="font-display text-sm tracking-[0.16em] uppercase">
            {title}
          </h3>
          <HudButton variant="ghost" onClick={onClose} aria-label="Close drawer">
            Close
          </HudButton>
        </div>
        {children}
      </aside>
    </div>,
    document.body,
  );
}
