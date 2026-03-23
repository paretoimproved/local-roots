"use client";

import { useCallback, useEffect, useRef } from "react";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  buyerName?: string;
  loading: boolean;
}

export function RefundModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  buyerName,
  loading,
}: RefundModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap: cycle focus within modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusable = [cancelBtnRef.current, confirmBtnRef.current].filter(
          Boolean,
        ) as HTMLElement[];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Auto-focus confirm button when modal opens
  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        className="lr-card lr-card-strong mx-4 w-full max-w-md p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-modal-title"
      >
        <h2
          id="refund-modal-title"
          className="font-serif text-lg text-[color:var(--lr-ink)]"
        >
          Refund this order?
        </h2>

        <div className="mt-3 text-sm text-[color:var(--lr-muted)]">
          {buyerName ? (
            <p>
              Buyer: <span className="font-medium text-[color:var(--lr-ink)]">{buyerName}</span>
            </p>
          ) : null}
          <p className="mt-1">
            Amount:{" "}
            <span className="font-semibold text-[color:var(--lr-ink)]">{amount}</span>
          </p>
        </div>

        <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
          The full amount will be returned to the buyer&apos;s card. This cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className="lr-btn lr-btn-destructive px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Processing…
              </span>
            ) : (
              `Refund ${amount}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
