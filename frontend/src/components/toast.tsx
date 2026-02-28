"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastInput = {
  kind: ToastKind;
  message: string;
  durationMs?: number;
};

type ToastState = ToastInput & { id: number };

type ToastContextValue = {
  toast: ToastState | null;
  showToast: (t: ToastInput) => void;
  clearToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [timerId, setTimerId] = useState<number | null>(null);

  const clearToast = useCallback(() => {
    if (timerId) window.clearTimeout(timerId);
    setTimerId(null);
    setToast(null);
  }, [timerId]);

  const showToast = useCallback(
    (t: ToastInput) => {
      if (timerId) window.clearTimeout(timerId);
      const id = ++nextId;
      const next: ToastState = { id, ...t };
      setToast(next);
      const ms = typeof t.durationMs === "number" ? t.durationMs : 4000;
      const tid = window.setTimeout(() => {
        setToast((cur) => (cur?.id === id ? null : cur));
        setTimerId(null);
      }, ms);
      setTimerId(tid);
    },
    [timerId],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, showToast, clearToast }),
    [toast, showToast, clearToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} onClose={clearToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

function ToastViewport({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  const tone =
    toast.kind === "success"
      ? {
          ring: "ring-emerald-200",
          bg: "bg-emerald-50/90",
          fg: "text-emerald-900",
          dot: "bg-emerald-600",
        }
      : toast.kind === "error"
        ? {
            ring: "ring-rose-200",
            bg: "bg-rose-50/90",
            fg: "text-rose-900",
            dot: "bg-rose-600",
          }
        : {
            ring: "ring-slate-200",
            bg: "bg-white/90",
            fg: "text-[color:var(--lr-ink)]",
            dot: "bg-slate-600",
          };

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[60] w-[min(22rem,calc(100vw-2rem))]">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 text-sm shadow-[0_22px_60px_rgba(38,28,10,0.16)] ring-1 backdrop-blur ${tone.bg} ${tone.fg} ${tone.ring}`}
      >
        <span
          aria-hidden="true"
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`}
        />
        <div className="min-w-0 flex-1">
          <div className="break-words">{toast.message}</div>
        </div>
        <button
          type="button"
          className="lr-btn lr-chip px-2 py-1 text-xs font-semibold text-[color:var(--lr-ink)]"
          onClick={onClose}
          aria-label="Dismiss"
        >
          Close
        </button>
      </div>
    </div>
  );
}

