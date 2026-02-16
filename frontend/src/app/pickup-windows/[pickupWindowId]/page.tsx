import Link from "next/link";
import { api } from "@/lib/api";
import { CheckoutForm } from "@/components/checkout-form";
import { RefreshButton } from "@/components/refresh-button";
import { formatMoney } from "@/lib/ui";

export default async function PickupWindowOfferingsPage({
  params,
}: {
  params: Promise<{ pickupWindowId: string }>;
}) {
  const { pickupWindowId } = await params;

  let offerings: Awaited<ReturnType<typeof api.listPickupWindowOfferings>> | null =
    null;
  let error: string | null = null;

  try {
    offerings = await api.listPickupWindowOfferings(pickupWindowId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            Offerings
          </h1>
          <p className="text-sm text-[color:var(--lr-muted)]">
            Pickup window: <span className="font-mono text-xs">{pickupWindowId}</span>
          </p>
        </div>
        <Link className="lr-btn px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]" href="/stores">
          Back to stores
        </Link>
      </div>

      {error ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load offerings
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
          <RefreshButton />
        </div>
      ) : null}

      {offerings && offerings.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">No offerings yet.</p>
        </div>
      ) : null}

      {offerings && offerings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-[1.35fr_0.9fr] md:items-start">
          <ul className="grid gap-3">
            {offerings.map((o) => (
              <li
                key={o.id}
                className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                      {o.product.title}
                    </h2>
                    <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                      {formatMoney(o.price_cents)} · {o.product.unit}
                      {o.product.description
                        ? ` · ${o.product.description}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[color:var(--lr-muted)]">
                    <div>{o.quantity_remaining} available</div>
                    <div className="mt-1">
                      <span className="inline-flex items-center rounded-full px-2 py-1 ring-1 ring-[color:var(--lr-border)]">
                        {o.status}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="md:sticky md:top-6">
            <CheckoutForm pickupWindowId={pickupWindowId} offerings={offerings} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
