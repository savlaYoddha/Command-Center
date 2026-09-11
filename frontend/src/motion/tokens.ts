export type AnimationIntensity = "off" | "subtle" | "standard" | "cinematic";
export type LayoutDensity = "compact" | "standard" | "comfortable";

export function normalizeAnimation(value: string | undefined): AnimationIntensity {
  if (value === "full") return "cinematic";
  if (value === "off" || value === "subtle" || value === "standard" || value === "cinematic") return value;
  return "subtle";
}

export function normalizeDensity(value: string | undefined): LayoutDensity {
  if (value === "compact" || value === "standard" || value === "comfortable") return value;
  return "standard";
}

export function bootDurationMs(intensity: AnimationIntensity, reducedMotion: boolean): number {
  if (reducedMotion || intensity === "off") return 0;
  if (intensity === "subtle") return 700;
  if (intensity === "cinematic") return 2100;
  return 1300;
}

export function applyMotionSettings(animation: string | undefined, density: string | undefined): void {
  const root = document.documentElement;
  root.dataset.anim = normalizeAnimation(animation);
  root.dataset.density = normalizeDensity(density);
}
