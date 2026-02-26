"use client";

import { useCallback, useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onCancel();
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      className="fixed inset-0 z-50 m-auto max-w-sm rounded-2xl border-0 bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={
            destructive
              ? "rounded-full px-4 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              : "lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
          }
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
