import type { ThemeMode } from "@/theme/tokens";
import { HudButton } from "./HudButton";

export function ThemeSelector({ value, onChange }: { value: ThemeMode; onChange: (mode: ThemeMode) => void }) {
  const options: ThemeMode[] = ["dark", "light", "system"];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((mode) => (
        <HudButton key={mode} type="button" variant={value === mode ? "primary" : "ghost"} onClick={() => onChange(mode)}>
          {mode}
        </HudButton>
      ))}
    </div>
  );
}
