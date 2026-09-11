import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useToastStore, type ToastTone } from "@/store/toastStore";
import { HudButton } from "./HudButton";

const TONE_LABEL: Record<ToastTone, string> = {
  success: "OK",
  warning: "WARN",
  error: "ERR",
  info: "INFO",
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--danger)",
  info: "var(--info)",
};

export function HudToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), toast.tone === "error" ? 8000 : 4200),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismiss]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-16 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" style={{ zIndex: "var(--cc-z-toast)" }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto border bg-[color:var(--surface-elevated)] p-3 shadow-hud hud-slide-in"
          style={{ borderColor: TONE_COLOR[toast.tone] }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-[10px] tracking-[0.2em] uppercase" style={{ color: TONE_COLOR[toast.tone] }}>
                {TONE_LABEL[toast.tone]}
              </div>
              <div className="mt-1 font-display text-xs tracking-[0.14em] uppercase">{toast.title}</div>
              {toast.body ? <p className="mt-1 text-sm text-text-secondary">{toast.body}</p> : null}
            </div>
            <HudButton type="button" variant="ghost" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
              Close
            </HudButton>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
