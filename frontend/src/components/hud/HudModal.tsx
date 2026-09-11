import { useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HudButton } from "./HudButton";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
  nested?: boolean;
  closeOnBackdrop?: boolean;
};

export function HudModal({
  open,
  title,
  children,
  onClose,
  size = "md",
  nested = false,
  closeOnBackdrop = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onEscape = useCallback(() => {
    if (open) onClose();
  }, [open, onClose]);
  useFocusTrap(open, panelRef, onEscape);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: nested ? "var(--cc-z-toast)" : "var(--cc-z-modal)" }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 hud-fade-in"
        aria-label="Close dialog overlay"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
      />
      <div
        ref={panelRef}
        className={`relative max-h-[min(90dvh,40rem)] w-full overflow-y-auto border border-[color:var(--border)] bg-[color:var(--modal-bg)] p-5 shadow-hud hud-scale-in ${
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-modal-title"
      >
        <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-[color:var(--accent)]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[color:var(--accent)]" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="hud-modal-title" className="font-display text-sm tracking-[0.16em] uppercase">
            {title}
          </h3>
          <HudButton variant="ghost" type="button" onClick={onClose} aria-label="Close dialog">
            Close
          </HudButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
