"use client";

import { useEffect, useMemo, useState } from "react";
import { fieldClass } from "@/lib/ui";

export function TimezoneCombobox({
  value,
  onChange,
  placeholder,
  invalid,
  onTouched,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  invalid?: boolean;
  onTouched?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);

  const zones = useMemo(() => {
    const usCommon = [
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
    ];
    const supported =
      typeof Intl !== "undefined" &&
      "supportedValuesOf" in Intl &&
      typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
        .supportedValuesOf === "function"
        ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf(
            "timeZone",
          )
        : [];
    const merged = Array.from(new Set([...usCommon, ...supported]));
    return merged;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones.slice(0, 12);
    return zones
      .filter((z) => z.toLowerCase().includes(q))
      .slice(0, 12);
  }, [zones, query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  return (
    <div className="relative">
      <input
        className={fieldClass("lr-field w-full px-3 py-2 text-sm", !!invalid)}
        value={query}
        placeholder={placeholder ?? "Timezone"}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          onTouched?.();
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const z = filtered[active];
            if (z) {
              onChange(z);
              setOpen(false);
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
        }}
        autoComplete="off"
        aria-label="Timezone"
        aria-invalid={!!invalid}
      />

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[color:var(--lr-border)] bg-white/95 shadow-[0_18px_50px_rgba(38,28,10,0.16)] backdrop-blur">
          <ul className="max-h-64 overflow-auto py-1">
            {filtered.length ? (
              filtered.map((z, idx) => {
                const isActive = idx === active;
                return (
                  <li key={z}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm"
                      style={{
                        background: isActive
                          ? "rgba(47, 107, 79, 0.10)"
                          : "transparent",
                      }}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        onChange(z);
                        setQuery(z);
                        setOpen(false);
                      }}
                    >
                      {z}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-sm text-[color:var(--lr-muted)]">
                No matches
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
