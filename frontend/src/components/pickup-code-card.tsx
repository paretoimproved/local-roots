"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast";

function chunk(code: string) {
  const c = code.replaceAll(/\s+/g, "");
  if (c.length <= 3) return c;
  return `${c.slice(0, 3)} ${c.slice(3)}`;
}

function makePayload(orderId: string, pickupCode: string) {
  return `${window.location.origin}/pickup/confirm?order=${orderId}&code=${pickupCode}`;
}

export function PickupCodeCard({
  storeId: _storeId,
  orderId,
  pickupCode,
  status,
}: {
  storeId: string;
  orderId: string;
  pickupCode: string;
  status: string;
}) {
  void _storeId; // kept for caller compatibility
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const payload = useMemo(
    () => {
      if (typeof window === "undefined") return "";
      return makePayload(orderId, pickupCode);
    },
    [orderId, pickupCode],
  );

  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setQr(null);
    setQrError(null);

    (async () => {
      try {
        // Dynamic import keeps server bundles clean.
        const mod = await import("qrcode");
        const dataUrl = await mod.toDataURL(payload, {
          margin: 1,
          width: 256,
          color: {
            dark: "#1c1b16",
            light: "#00000000",
          },
        });
        if (!mounted) return;
        setQr(dataUrl);
      } catch (e) {
        if (!mounted) return;
        setQrError(e instanceof Error ? e.message : "Could not generate QR");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [payload]);

  if (!pickupCode) return null;

  const completed = status === "picked_up";

  return (
    <section className="lr-card lr-card-strong border-l-4 border-green-600 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[color:var(--lr-ink)]">
            {completed ? "Pickup confirmed" : "Pickup code"}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
            {completed
              ? "This order has been marked as picked up."
              : "Show this code (or QR) to the seller at pickup."}
          </p>

          {!completed ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="lr-chip rounded-full px-4 py-2 font-mono text-lg font-semibold tracking-widest text-[color:var(--lr-ink)]">
                  {chunk(pickupCode)}
                </span>
                <button
                  type="button"
                  className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pickupCode);
                      setCopied(true);
                      clearTimeout(copyTimer.current);
                      copyTimer.current = setTimeout(() => setCopied(false), 1400);
                      showToast({ kind: "success", message: "Pickup code copied." });
                    } catch {
                      showToast({
                        kind: "error",
                        message: "Could not copy. Your browser may block clipboard access.",
                      });
                    }
                  }}
                  title="Copy pickup code"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="mt-3 text-xs text-[color:var(--lr-muted)]">
                The seller scans this with their phone camera to confirm your pickup.
              </div>
            </>
          ) : null}
        </div>

        {!completed ? (
          <div className="grid justify-items-end gap-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="Pickup QR code"
                className="h-32 w-32 rounded-2xl border border-[color:var(--lr-border)] bg-white/40 p-2 shadow-[0_14px_40px_rgba(38,28,10,0.14)]"
              />
            ) : (
              <div className="h-32 w-32 rounded-2xl border border-[color:var(--lr-border)] bg-white/40 p-2" />
            )}
            {qrError ? (
              <div className="max-w-[12rem] text-right text-xs text-[color:var(--lr-muted)]">
                QR unavailable: {qrError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
