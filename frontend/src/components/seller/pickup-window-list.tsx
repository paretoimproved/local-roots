"use client";

import { useState } from "react";
import { type SellerPickupWindow } from "@/lib/seller-api";
import { StatusPill } from "@/components/seller/status-pills";

function formatWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `Window (${w.status})`;
  }
  return `${start.toLocaleString()}\u2013${end.toLocaleTimeString()} (${w.status})`;
}

function friendlyWindowLabel(w: SellerPickupWindow): string {
  const start = new Date(w.start_at);
  const end = new Date(w.end_at);
  const now = new Date();

  const isToday = start.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  const dayLabel = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : start.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

  const location = w.pickup_location.label ?? w.pickup_location.city;

  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dayLabel} \u00b7 ${location} \u00b7 ${startTime}\u2013${endTime}`;
}

interface PickupWindowListProps {
  windows: SellerPickupWindow[] | null;
  selectedWindowId: string;
  selectedWindow: SellerPickupWindow | null;
  onWindowChange: (windowId: string) => void;
}

export function PickupWindowList({
  windows,
  selectedWindowId,
  selectedWindow,
  onWindowChange,
}: PickupWindowListProps) {
  const [showSelector, setShowSelector] = useState(false);

  return (
    <section className="lr-card lr-card-strong lr-animate sticky top-3 z-10 p-4 md:p-5">
      {selectedWindow ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-[color:var(--lr-ink)]">
              {friendlyWindowLabel(selectedWindow)}
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={selectedWindow.status} />
              <button
                type="button"
                className="text-sm font-medium text-[color:var(--lr-muted)] underline"
                onClick={() => setShowSelector((v) => !v)}
              >
                {showSelector ? "Close" : "Change"}
              </button>
            </div>
          </div>
          <div className="text-sm text-[color:var(--lr-muted)]">
            {selectedWindow.pickup_location.label ?? "Pickup"} &middot;{" "}
            {selectedWindow.pickup_location.city},{" "}
            {selectedWindow.pickup_location.region}
            {" \u00b7 "}Orders close{" "}
            <span className="font-medium text-[color:var(--lr-ink)]">
              {new Date(selectedWindow.cutoff_at).toLocaleDateString(
                undefined,
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                },
              )}
            </span>
          </div>
          {showSelector && (
            <select
              className="lr-field mt-1 px-3 py-2 text-sm"
              aria-label="Select pickup window"
              value={selectedWindowId}
              onChange={(e) => {
                onWindowChange(e.target.value);
                setShowSelector(false);
              }}
            >
              {(windows ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {formatWindowLabel(w)}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <select
            className="lr-field px-3 py-2 text-sm"
            aria-label="Select pickup window"
            value={selectedWindowId}
            onChange={(e) => onWindowChange(e.target.value)}
          >
            <option value="">Select a window&hellip;</option>
            {(windows ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {formatWindowLabel(w)}
              </option>
            ))}
          </select>
          <div className="text-sm text-[color:var(--lr-muted)]">
            Generate a box cycle to create a pickup window.
          </div>
        </div>
      )}
    </section>
  );
}
