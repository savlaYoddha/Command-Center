import { useState } from "react";
import { HudButton, HudInput, HudModal } from "@/components/ui";
import type { TaskLabel } from "../types";

type Props = {
  open: boolean;
  labels: TaskLabel[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, patch: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function LabelManager({ open, labels, onClose, onCreate, onUpdate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00BFFF");

  return (
    <HudModal open={open} title="Label database" onClose={onClose}>
      <div className="space-y-3">
        {labels.map((label) => (
          <div key={label.id} className="flex items-center gap-2 border border-[color:var(--border)] p-2">
            <input
              type="color"
              value={label.color}
              onChange={(e) => void onUpdate(label.id, { color: e.target.value })}
              className="h-8 w-8 bg-transparent"
            />
            <HudInput
              label="Label name"
              defaultValue={label.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== label.name) {
                  void onUpdate(label.id, { name: e.target.value });
                }
              }}
            />
            <HudButton variant="danger" type="button" onClick={() => void onDelete(label.id)}>
              Delete
            </HudButton>
          </div>
        ))}
        <div className="flex items-end gap-2">
          <HudInput label="New label" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-10" />
          <HudButton
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              void onCreate(name.trim(), color).then(() => setName(""));
            }}
          >
            Add
          </HudButton>
        </div>
      </div>
    </HudModal>
  );
}
