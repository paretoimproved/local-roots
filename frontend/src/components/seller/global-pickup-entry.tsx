"use client";

import { useRef, useState } from "react";
import { sellerApi, type SellerOrder } from "@/lib/seller-api";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { StatusPill } from "@/components/seller/status-pills";

interface GlobalPickupEntryProps {
  token: string;
  storeId: string;
  onPickupConfirmed: () => void;
  showToast: (toast: { kind: "success" | "error"; message: string }) => void;
}

export function GlobalPickupEntry({
  token,
  storeId,
  onPickupConfirmed,
  showToast,
}: GlobalPickupEntryProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<SellerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLookup() {
    const trimmed = code.trim();
    if (trimmed.length !== 6 || !/^[0-9]{6}$/.test(trimmed)) {
      setError("Enter a 6-digit pickup code.");
      return;
    }
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const order = await sellerApi.lookupByCode(token, storeId, trimmed);
      setPreview(order);
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await sellerApi.confirmPickup(token, storeId, preview.id, code.trim());
      showToast({ kind: "success", message: "Pickup confirmed!" });
      setPreview(null);
      setCode("");
      inputRef.current?.focus();
      onPickupConfirmed();
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (preview) {
        handleConfirm();
      } else if (code.trim().length === 6) {
        handleLookup();
      }
    }
  }

  return (
    <section className="lr-card lr-card-strong p-5">
      <div className="text-sm font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
        Confirm pickup
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          ref={inputRef}
          className="lr-field w-44 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] tabular-nums"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (preview) setPreview(null);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={busy}
          autoComplete="off"
        />
        {preview ? (
          <button
            type="button"
            className="lr-btn lr-btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Confirming\u2026" : "Confirm pickup"}
          </button>
        ) : (
          <button
            type="button"
            className="lr-btn lr-btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={handleLookup}
            disabled={busy || code.trim().length !== 6}
          >
            {busy ? "Looking up\u2026" : "Look up"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-[color:var(--lr-muted)]">
        Enter the buyer&apos;s 6-digit code, or scan their QR with your phone camera.
      </p>

      {error ? (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[color:var(--lr-leaf)]/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {preview.buyer_name ?? preview.buyer_email.split("@")[0]}
              </span>
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(preview.total_cents)}
              </span>
              <StatusPill status={preview.status} />
            </div>
            <div className="mt-1 truncate text-sm text-[color:var(--lr-muted)]">
              {preview.items.map((it) => `${it.quantity}x ${it.product_title}`).join(", ")}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
