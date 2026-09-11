import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";
import { bootDurationMs, normalizeAnimation } from "./tokens";

let documentBootConsumed = false;

type BootContextValue = {
  booting: boolean;
  intensity: ReturnType<typeof normalizeAnimation>;
};

const BootContext = createContext<BootContextValue>({ booting: false, intensity: "subtle" });

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CommandBootSequence({ children }: { children: ReactNode }) {
  return <BootProvider>{children}</BootProvider>;
}

export function BootProvider({ children }: { children: ReactNode }) {
  const settingsAnim = useAuthStore((s) => s.settings?.animationIntensity);
  const intensity = normalizeAnimation(settingsAnim ?? document.documentElement.dataset.anim);
  const [booting, setBooting] = useState(() => {
    if (documentBootConsumed) return false;
    documentBootConsumed = true;
    if (prefersReducedMotion()) return false;
    return intensity !== "off";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (!booting) {
      root.dataset.ccBoot = "0";
      return;
    }
    root.dataset.ccBoot = "1";
    const handle = window.setTimeout(() => {
      root.dataset.ccBoot = "0";
      setBooting(false);
    }, bootDurationMs(intensity, false));
    return () => window.clearTimeout(handle);
  }, [booting, intensity]);

  const value = useMemo(() => ({ booting, intensity }), [booting, intensity]);
  return <BootContext.Provider value={value}>{children}</BootContext.Provider>;
}

export function useBoot(): BootContextValue {
  return useContext(BootContext);
}
