"use client";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export function QuantityStepper({
  value,
  min = 0,
  max,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-0 rounded-full border border-[color:var(--lr-border)] bg-white/60">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-l-full text-sm font-semibold text-[color:var(--lr-ink)] transition hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-x border-[color:var(--lr-border)] text-sm font-semibold text-[color:var(--lr-ink)] tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-r-full text-sm font-semibold text-[color:var(--lr-ink)] transition hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
