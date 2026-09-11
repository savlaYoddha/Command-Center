import { useEffect, useMemo, useState } from "react";
import { ApiKeyManager } from "@/components/hud/ApiKeyManager";
import { ColorTokenEditor } from "@/components/hud/ColorTokenEditor";
import { ExportImportDialog } from "@/components/hud/ExportImportDialog";
import { ThemeEditor } from "@/components/hud/ThemeEditor";
import { ThemeSelector } from "@/components/hud/ThemeSelector";
import { CommandPanel } from "@/components/hud/CommandPanel";
import { HudBackButton } from "@/components/hud/HudBackButton";
import { HudButton } from "@/components/hud/HudButton";
import { HudInput } from "@/components/hud/HudInput";
import { HudSelect } from "@/components/hud/HudSelect";
import { SectionHeader } from "@/components/hud/SectionHeader";
import { api } from "@/services/api";
import { authService, settingsService } from "@/services/commandcenter";
import { useAuthStore } from "@/store/authStore";
import { notify } from "@/store/toastStore";
import { applyTheme, resolveThemeBase } from "@/theme/engine";
import { applyPreferencesImport, collectPreferences, validatePreferences } from "@/theme/preferences";
import { normalizeAnimation, normalizeDensity } from "@/motion/tokens";
import {
  persistActiveTheme,
  persistCustomThemes,
  persistThemeMode,
  persistThemeTokens,
  readCustomThemes,
  readStoredActiveTheme,
  readStoredMode,
  readStoredTokens,
  resetThemeTokens,
  resolvedMode,
  type CustomTheme,
  type ThemeMode,
  type ThemeTokenMap,
} from "@/theme/tokens";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const settings = useAuthStore((s) => s.settings);
  const setSettings = useAuthStore((s) => s.setSettings);
  const logout = useAuthStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [mode, setMode] = useState<ThemeMode>(readStoredMode());
  const [overrides, setOverrides] = useState<ThemeTokenMap>(readStoredTokens());
  const [activeTheme, setActiveTheme] = useState(readStoredActiveTheme());
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(readCustomThemes());
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const displayTokens = useMemo(() => {
    const resolved = resolvedMode(mode, systemDark);
    const base = resolveThemeBase(resolved, activeTheme);
    return { ...base, ...overrides };
  }, [mode, overrides, systemDark, activeTheme]);

  function commitTheme(nextMode: ThemeMode, nextOverrides: ThemeTokenMap, nextActive = activeTheme) {
    persistThemeMode(nextMode);
    persistThemeTokens(nextOverrides);
    persistActiveTheme(nextActive);
    applyTheme(nextMode, nextOverrides, nextActive);
    setMode(nextMode);
    setOverrides(nextOverrides);
    setActiveTheme(nextActive);
  }

  async function saveAppearance() {
    if (!settings) return;
    const next = await settingsService.update({
      ...settings,
      theme: mode,
      accentColor: displayTokens["--accent"] ?? settings.accentColor,
      animationIntensity: settings.animationIntensity,
      layoutDensity: settings.layoutDensity,
    });
    setSettings(next);
    notify("success", "THEME SAVED");
  }

  async function onChangePassword() {
    await authService.changePassword(currentPassword, nextPassword);
    notify("success", "PASSCODE UPDATED");
    await logout();
  }

  function saveCustom(name: string) {
    const theme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name,
      tokens: displayTokens,
      createdAt: Date.now(),
    };
    const next = [...customThemes, theme];
    persistCustomThemes(next);
    setCustomThemes(next);
    commitTheme(mode, {}, theme.id);
    notify("success", "THEME SAVED", name);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader kicker="Operator" title="Settings" />
        <HudBackButton fallback="/" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 hud-stagger">
        <CommandPanel className="space-y-5 p-5" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Profile</h3>
          <p className="text-sm text-text-secondary">
            Operator: {user?.displayName} ({user?.username})
          </p>
          <HudButton variant="ghost" className="mt-2" onClick={() => void logout()}>
            End session
          </HudButton>
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Appearance</h3>
          <ThemeSelector
            value={mode}
            onChange={(next) => {
              commitTheme(next, overrides);
            }}
          />
          <HudSelect
            label="Animation intensity"
            value={normalizeAnimation(settings?.animationIntensity)}
            onChange={(e) => {
              if (!settings) return;
              const animationIntensity = e.target.value;
              setSettings({ ...settings, animationIntensity });
              void settingsService.update({ animationIntensity }).then(setSettings);
            }}
          >
            <option value="off">Off</option>
            <option value="subtle">Subtle</option>
            <option value="standard">Standard</option>
            <option value="cinematic">Cinematic</option>
          </HudSelect>
          <HudSelect
            label="Layout density"
            value={normalizeDensity(settings?.layoutDensity)}
            onChange={(e) => {
              if (!settings) return;
              const layoutDensity = e.target.value;
              setSettings({ ...settings, layoutDensity });
              void settingsService.update({ layoutDensity }).then(setSettings);
            }}
          >
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="comfortable">Comfortable</option>
          </HudSelect>
          <HudButton className="mt-2" onClick={() => void saveAppearance()}>
            Save appearance
          </HudButton>
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5 lg:col-span-2" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Themes</h3>
          <ThemeEditor
            activeId={activeTheme}
            customThemes={customThemes}
            currentTokens={displayTokens}
            onApply={(id) => commitTheme(mode, {}, id)}
            onSaveCustom={saveCustom}
            onRename={(id, name) => {
              const next = customThemes.map((item) => (item.id === id ? { ...item, name } : item));
              persistCustomThemes(next);
              setCustomThemes(next);
            }}
            onDuplicate={(id) => {
              const source = customThemes.find((item) => item.id === id);
              if (!source) return;
              const copy: CustomTheme = {
                ...source,
                id: `custom-${Date.now()}`,
                name: `${source.name} COPY`,
                createdAt: Date.now(),
              };
              const next = [...customThemes, copy];
              persistCustomThemes(next);
              setCustomThemes(next);
            }}
            onDelete={(id) => {
              const next = customThemes.filter((item) => item.id !== id);
              persistCustomThemes(next);
              setCustomThemes(next);
              if (activeTheme === id) commitTheme(mode, {}, "command-default");
            }}
          />
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5 lg:col-span-2" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Color system</h3>
          <p className="text-sm text-text-secondary">
            Tokens persist locally. Editing colors updates the active theme overlay. Reset restores the selected built-in
            or saved theme.
          </p>
          <ColorTokenEditor
            values={displayTokens}
            onChange={(next) =>
              commitTheme(mode, diffOverrides(next, resolveThemeBase(resolvedMode(mode, systemDark), activeTheme)))
            }
            onReset={() => {
              resetThemeTokens();
              commitTheme(mode, {}, activeTheme);
              notify("info", "THEME RESET");
            }}
          />
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Security</h3>
          <HudInput
            label="Current passcode"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <HudInput
            label="New passcode"
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
          />
          <HudButton variant="danger" className="mt-2" onClick={() => void onChangePassword()}>
            Update passcode
          </HudButton>
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">Backup / restore</h3>
          <ExportImportDialog
            title="Restore tasks"
            exportLabel="Export tasks"
            importLabel="Restore tasks"
            filenamePrefix="commandcenter-tasks"
            description="Export or restore the Tasks module as JSON. Attachments and credentials are not included."
            confirmMessage="Restore task data now? This does not change passwords or API keys."
            onExport={async () => {
              const payload = await api.get("/api/v1/backups/tasks");
              notify("success", "TASK DATA EXPORTED");
              return payload;
            }}
            onImport={async (backup, restoreMode) => {
              await api.post("/api/v1/backups/tasks", { mode: restoreMode, backup });
              notify("success", "IMPORT COMPLETE");
            }}
          />
          <ExportImportDialog
            title="Restore preferences"
            exportLabel="Export preferences"
            importLabel="Restore preferences"
            filenamePrefix="commandcenter-preferences"
            showMode={false}
            description="Theme mode, active theme, operator themes, color tokens, animation and layout. Does not include credentials."
            confirmMessage="Apply imported preferences? Authentication data will not be overwritten."
            onExport={async () => {
              const saved = await api.get<Array<{ name: string; payloadJson: string }>>("/api/v1/saved-filters");
              const file = collectPreferences(settings, saved);
              notify("success", "PREFERENCES EXPORTED");
              return file;
            }}
            onImport={async (payload) => {
              const file = validatePreferences(payload);
              const applied = applyPreferencesImport(file);
              setMode(applied.themeMode);
              setActiveTheme(file.preferences.activeTheme);
              setCustomThemes(file.preferences.customThemes);
              setOverrides(file.preferences.colors ?? {});
              if (settings) {
                const next = await settingsService.update({
                  theme: applied.themeMode,
                  animationIntensity: applied.animation,
                  layoutDensity: applied.layout,
                });
                setSettings(next);
              }
              notify("success", "IMPORT COMPLETE");
            }}
          />
        </CommandPanel>

        <CommandPanel className="space-y-5 p-5 lg:col-span-2" hatch>
          <h3 className="font-display text-xs tracking-[0.18em] uppercase">API keys</h3>
          <ApiKeyManager />
        </CommandPanel>
      </div>
    </div>
  );
}

function diffOverrides(next: ThemeTokenMap, base: ThemeTokenMap): ThemeTokenMap {
  const out: ThemeTokenMap = {};
  for (const [key, value] of Object.entries(next)) {
    if (base[key] !== value) out[key] = value;
  }
  return out;
}
