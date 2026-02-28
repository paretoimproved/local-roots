import Link from "next/link";
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
  return (
    <section className="lr-card lr-card-strong lr-animate sticky top-3 z-10 grid gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {selectedWindowId ? (
          <Link
            className="lr-btn lr-chip px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/pickup-windows/${selectedWindowId}`}
            target="_blank"
            rel="noreferrer"
          >
            Buyer view
          </Link>
        ) : null}
      </div>

      {selectedWindow ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-base font-semibold text-[color:var(--lr-ink)]">
              {(() => {
                const start = new Date(selectedWindow.start_at);
                const end = new Date(selectedWindow.end_at);
                const now = new Date();
                const label = start > now ? "Next pickup" : "Current pickup";
                const day = start.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const startTime = start.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                });
                const endTime = end.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return `${label} \u00b7 ${day} \u00b7 ${startTime} \u2013 ${endTime}`;
              })()}
            </div>
            <StatusPill status={selectedWindow.status} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--lr-muted)]">
            <span>
              {selectedWindow.pickup_location.label ?? "Pickup"} &middot;{" "}
              {selectedWindow.pickup_location.city},{" "}
              {selectedWindow.pickup_location.region}
            </span>
            <span>&middot;</span>
            <span>
              Orders close{" "}
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
            </span>
          </div>
        </>
      ) : (
        <div className="text-sm text-[color:var(--lr-muted)]">
          Generate a box cycle to create a pickup window.
        </div>
      )}
    </section>
  );
}
