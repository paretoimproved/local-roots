import Link from "next/link";
import { api } from "@/lib/api";
import { CheckoutForm } from "@/components/checkout-form";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function PickupWindowOfferingsPage({
  params,
}: {
  params: { pickupWindowId: string };
}) {
  const { pickupWindowId } = params;

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
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Offerings</h1>
        <p className="text-sm text-zinc-600">Pickup window: {pickupWindowId}</p>
      </div>

      {error ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm font-medium text-zinc-950">
            Could not load offerings
          </p>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
        </div>
      ) : null}

      {offerings && offerings.length === 0 ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm text-zinc-600">No offerings yet.</p>
        </div>
      ) : null}

      {offerings && offerings.length > 0 ? (
        <>
          <ul className="grid gap-3">
            {offerings.map((o) => (
              <li
                key={o.id}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950">
                      {o.product.title}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600">
                      {formatMoney(o.price_cents)} · {o.product.unit}
                      {o.product.description
                        ? ` · ${o.product.description}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <div>{o.quantity_remaining} available</div>
                    <div className="mt-1">Status: {o.status}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <CheckoutForm pickupWindowId={pickupWindowId} offerings={offerings} />
        </>
      ) : null}

      <div>
        <Link className="text-sm text-zinc-600 hover:text-zinc-950" href="/stores">
          Back to stores
        </Link>
      </div>
    </div>
  );
}
