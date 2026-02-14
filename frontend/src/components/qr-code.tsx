"use client";

import { useEffect, useState } from "react";

export function QrCode({
  value,
  size = 180,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setDataUrl(null);
    setErr(null);

    (async () => {
      try {
        const mod = await import("qrcode");
        const url = await mod.toDataURL(value, {
          margin: 1,
          width: size,
          color: { dark: "#1c1b16", light: "#00000000" },
        });
        if (!mounted) return;
        setDataUrl(url);
      } catch (e) {
        if (!mounted) return;
        setErr(e instanceof Error ? e.message : "QR error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [value, size]);

  return (
    <div className="grid justify-items-center gap-2">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={label ?? "QR code"}
          className="rounded-2xl border border-[color:var(--lr-border)] bg-white/40 p-2 shadow-[0_14px_40px_rgba(38,28,10,0.14)]"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-2xl border border-[color:var(--lr-border)] bg-white/40 p-2"
          style={{ width: size, height: size }}
        />
      )}
      {err ? (
        <div className="text-center text-xs text-[color:var(--lr-muted)]">
          QR unavailable: {err}
        </div>
      ) : null}
    </div>
  );
}

