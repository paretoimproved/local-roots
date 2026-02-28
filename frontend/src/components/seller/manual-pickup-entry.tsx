interface ManualPickupEntryProps {
  orderId: string;
  pickupCode: string;
  onPickupCodeChange: (orderId: string, code: string) => void;
  onConfirm: (orderId: string) => void;
  busy: boolean;
}

export function ManualPickupEntry({
  orderId,
  pickupCode,
  onPickupCodeChange,
  onConfirm,
  busy,
}: ManualPickupEntryProps) {
  return (
    <div className="grid gap-2">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[color:var(--lr-muted)]">
          Pickup code
        </span>
        <input
          className="lr-field w-40 px-3 py-2 text-sm font-mono tracking-widest"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="123456"
          value={pickupCode}
          onChange={(e) =>
            onPickupCodeChange(
              orderId,
              e.target.value.replace(/\D/g, "").slice(0, 6),
            )
          }
        />
      </label>
      <button
        type="button"
        className="lr-btn lr-btn-primary px-3 py-2 text-sm font-semibold disabled:opacity-50"
        onClick={() => onConfirm(orderId)}
        disabled={busy}
      >
        {busy ? "Confirming\u2026" : "Confirm"}
      </button>
    </div>
  );
}
