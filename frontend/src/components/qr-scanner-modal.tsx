"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ScanResult = {
  raw: string;
  parsed?: {
    v: number;
    store_id: string;
    order_id: string;
    pickup_code: string;
  };
};

function parseLocalRootsPickup(raw: string): ScanResult {
  const trimmed = raw.trim();
  const parts = trimmed.split("|");
  if (parts.length === 5 && parts[0] === "LR") {
    const v = Number(parts[1]);
    const store_id = parts[2] ?? "";
    const order_id = parts[3] ?? "";
    const pickup_code = parts[4] ?? "";
    if (
      v === 1 &&
      store_id &&
      order_id &&
      /^[0-9]{6}$/.test(pickup_code)
    ) {
      return {
        raw: trimmed,
        parsed: { v, store_id, order_id, pickup_code },
      };
    }
  }
  return { raw: trimmed };
}

export function QrScannerModal({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (res: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const supported = useMemo(() => {
    // BarcodeDetector is supported in Chromium; Safari support is spotty.
    return typeof window !== "undefined" && "BarcodeDetector" in window;
  }, []);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setActive(false);

    if (!supported) {
      setErr("QR scanning is not supported in this browser. Enter the code.");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) throw new Error("camera not available");
        video.srcObject = stream;
        await video.play();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
        setActive(true);

        const tick = async () => {
          if (cancelled) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes?.length) {
              const raw = String(barcodes[0].rawValue ?? "").trim();
              if (raw) {
                onScan(parseLocalRootsPickup(raw));
                onClose();
                return;
              }
            }
          } catch {
            // Ignore detect errors; keep scanning.
          }
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
        };

        void tick();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "camera error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      setActive(false);
      if (raf) window.cancelAnimationFrame(raf);
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
    };
  }, [open, onClose, onScan, supported]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan pickup QR code"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lr-card lr-card-strong w-full max-w-md p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-[color:var(--lr-ink)]">
              Scan pickup QR
            </div>
            <div className="mt-1 text-sm text-[color:var(--lr-muted)]">
              Aim at the buyer&apos;s QR code.
            </div>
          </div>
          <button
            type="button"
            className="lr-btn lr-chip px-3 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--lr-border)] bg-white/40">
          <video
            ref={videoRef}
            className="h-72 w-full object-cover"
            playsInline
            muted
          />
        </div>

        <div className="mt-3 text-xs text-[color:var(--lr-muted)]">
          {err
            ? `Scan unavailable: ${err}`
            : active
              ? "Scanning…"
              : "Starting camera…"}
        </div>
      </div>
    </div>
  );
}

