import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useBoot } from "@/motion/boot";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { intensity } = useBoot();
  const [loading, setLoading] = useState(true);
  const moduleName = location.pathname === "/" ? "COMMAND CENTER" : location.pathname.split("/")[1]?.replace(/-/g, " ").toUpperCase() ?? "SYSTEM";

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (intensity === "off" || reducedMotion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 520);
    return () => window.clearTimeout(timer);
  }, [location.pathname, intensity]);

  return (
    <div key={location.pathname} className="relative min-h-full hud-page-enter" aria-busy={loading}>
      {loading ? (
        <div className="cc-page-loader" role="status" aria-label={`Loading ${moduleName}`}>
          <div className="cc-page-loader__frame">
            <div className="cc-page-loader__rail"><span /></div>
            <div className="cc-page-loader__label">INITIALIZING {moduleName}</div>
            <div className="cc-page-loader__readout"><span>HUD LINK</span><span>SYNC OK</span><span>100%</span></div>
            <div className="cc-page-loader__progress"><span /></div>
          </div>
        </div>
      ) : null}
      <div className={loading ? "pointer-events-none opacity-0" : "cc-page-content"}>
        {children}
      </div>
    </div>
  );
}

export function HudFadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hud-fade-in ${className}`}>{children}</div>;
}

export function HudSlideIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hud-slide-in ${className}`}>{children}</div>;
}

export function HudScaleIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hud-scale-in ${className}`}>{children}</div>;
}

export function HudReveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div className={`hud-reveal ${className}`} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}

export function HudStagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`hud-stagger ${className}`}>{children}</div>;
}

export function HudPanelReveal({ children, delayMs = 0, className = "" }: { children: ReactNode; delayMs?: number; className?: string }) {
  return (
    <div className={`hud-panel-reveal ${className}`} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}

export function HudCardReveal({ children, delayMs = 0, className = "" }: { children: ReactNode; delayMs?: number; className?: string }) {
  return (
    <div className={`hud-card-reveal ${className}`} style={{ animationDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}

export function HudPulse({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`hud-pulse ${className}`}>{children}</span>;
}

export function HudSkeleton({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="hud-skeleton h-3" style={{ width: `${88 - index * 8}%` }} />
      ))}
    </div>
  );
}

export function HudProgress({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? <div className="mb-1 font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">{label}</div> : null}
      <div className="h-px w-full overflow-hidden bg-[color:var(--border)]" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-[color:var(--accent)] transition-[width] duration-[var(--anim)]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function HudLoading({ label = "LOADING COMMAND DATA..." }: { label?: string }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 hud-fade-in">
      <div className="h-px w-48 overflow-hidden bg-[color:var(--border)]">
        <div className="hud-progress-scan h-full w-1/2 bg-[color:var(--accent)]" />
      </div>
      <div className="font-display text-[10px] tracking-[0.28em] text-text-muted uppercase">{label}</div>
    </div>
  );
}
