"use client";

export function StatusPill({
  status,
}: {
  status: "placed" | "ready" | "picked_up" | "no_show" | "canceled" | string;
}) {
  const style =
    status === "picked_up"
      ? {
          border: "rgba(47, 107, 79, 0.28)",
          bg: "rgba(47, 107, 79, 0.10)",
          fg: "var(--lr-leaf)",
        }
      : status === "ready"
        ? {
            border: "rgba(31, 108, 120, 0.28)",
            bg: "rgba(31, 108, 120, 0.10)",
            fg: "var(--lr-water)",
          }
        : status === "no_show" || status === "canceled"
          ? {
              border: "rgba(179, 93, 46, 0.30)",
              bg: "rgba(179, 93, 46, 0.10)",
              fg: "var(--lr-clay)",
            }
          : {
              border: "var(--lr-border)",
              bg: "rgba(255, 255, 255, 0.65)",
              fg: "var(--lr-ink)",
            };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: style.border,
        background: style.bg,
        color: style.fg,
      }}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PaymentPill({
  status,
}: {
  status:
    | "unpaid"
    | "pending"
    | "authorized"
    | "paid"
    | "voided"
    | "failed"
    | "refunded"
    | "requires_action"
    | string;
}) {
  const style =
    status === "paid"
      ? {
          border: "rgba(47, 107, 79, 0.28)",
          bg: "rgba(47, 107, 79, 0.10)",
          fg: "var(--lr-leaf)",
        }
      : status === "authorized"
        ? {
            border: "rgba(31, 108, 120, 0.28)",
            bg: "rgba(31, 108, 120, 0.10)",
            fg: "var(--lr-water)",
          }
        : status === "pending" || status === "requires_action"
          ? {
              border: "rgba(90, 85, 73, 0.28)",
              bg: "rgba(90, 85, 73, 0.08)",
              fg: "var(--lr-muted)",
            }
          : status === "failed"
            ? {
                border: "rgba(179, 93, 46, 0.30)",
                bg: "rgba(179, 93, 46, 0.10)",
                fg: "var(--lr-clay)",
              }
            : status === "voided" || status === "refunded"
              ? {
                  border: "rgba(179, 93, 46, 0.22)",
                  bg: "rgba(179, 93, 46, 0.06)",
                  fg: "var(--lr-clay)",
                }
              : {
                  border: "var(--lr-border)",
                  bg: "rgba(255, 255, 255, 0.65)",
                  fg: "var(--lr-ink)",
                };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: style.border,
        background: style.bg,
        color: style.fg,
      }}
      title="Payment status"
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
