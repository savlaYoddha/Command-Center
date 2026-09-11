import { useState } from "react";
import { ThemePresetGrid } from "./ThemePresetCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { HudButton } from "./HudButton";
import { HudInput } from "./HudInput";
import type { CustomTheme, ThemeTokenMap } from "@/theme/tokens";
import { isBuiltinThemeId } from "@/theme/presets";

type Props = {
  activeId: string;
  customThemes: CustomTheme[];
  currentTokens: ThemeTokenMap;
  onApply: (id: string) => void;
  onSaveCustom: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ThemeEditor({
  activeId,
  customThemes,
  currentTokens,
  onApply,
  onSaveCustom,
  onRename,
  onDuplicate,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selectedCustom = customThemes.find((item) => item.id === activeId);

  return (
    <div className="space-y-4">
      <ThemePresetGrid activeId={activeId} customThemes={customThemes} onApply={onApply} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-56">
          <HudInput
            label="Save current colors as theme"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="MY MIDNIGHT THEME"
          />
        </div>
        <HudButton
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            onSaveCustom(name.trim());
            setName("");
          }}
        >
          Save theme
        </HudButton>
      </div>
      {selectedCustom ? (
        <div className="flex flex-wrap gap-2">
          <HudButton
            type="button"
            variant="ghost"
            onClick={() => {
              const next = window.prompt("Rename theme", selectedCustom.name);
              if (next?.trim()) onRename(selectedCustom.id, next.trim());
            }}
          >
            Rename
          </HudButton>
          <HudButton type="button" variant="ghost" onClick={() => onDuplicate(selectedCustom.id)}>
            Duplicate
          </HudButton>
          <HudButton type="button" variant="danger" onClick={() => setDeleteId(selectedCustom.id)}>
            Delete theme
          </HudButton>
        </div>
      ) : isBuiltinThemeId(activeId) ? (
        <p className="text-sm text-text-muted">Built-in themes cannot be deleted. Save a copy to customize further.</p>
      ) : null}
      <p className="sr-only">Active swatch {currentTokens["--accent"]}</p>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete operator theme"
        danger
        confirmLabel="Delete"
        body={<p>This removes the saved theme. Built-in COMMANDCENTER themes are not affected.</p>}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
