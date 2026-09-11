import type { ReactNode } from "react";
import { HudModal } from "./HudModal";
import { HudButton } from "./HudButton";

type Props = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <HudModal open={open} title={title} onClose={onCancel} nested>
      <div className="space-y-4 text-sm text-text-secondary">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <HudButton variant="ghost" type="button" onClick={onCancel}>
          {cancelLabel}
        </HudButton>
        <HudButton variant={danger ? "danger" : "primary"} type="button" disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </HudButton>
      </div>
    </HudModal>
  );
}
