"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";

/** Yes/No confirmation, used before destructive actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onCancel}
      title={title}
      closeLabel={cancelLabel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm">{message}</p>
    </Modal>
  );
}
