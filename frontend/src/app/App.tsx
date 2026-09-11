import { useEffect } from "react";
import { AppRouter } from "./router";
import { useAuthStore } from "@/store/authStore";
import { LoadingState } from "@/components/hud/LoadingState";
import { applyTheme } from "@/theme/engine";
import { readStoredMode } from "@/theme/tokens";

export function App() {
  const ready = useAuthStore((s) => s.ready);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(readStoredMode());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[color:var(--bg-primary)]">
        <LoadingState label="ESTABLISHING UPLINK..." />
      </div>
    );
  }

  return <AppRouter />;
}
