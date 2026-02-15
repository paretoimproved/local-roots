import { headers } from "next/headers";
import Link from "next/link";

import { requestJSON } from "@/lib/http";
import { PrintPosterActions } from "@/components/print-poster-actions";

type Plan = {
  id: string;
  store_id: string;
  title: string;
  cadence: string;
  price_cents: number;
  subscriber_limit: number;
  first_start_at: string;
  duration_minutes: number;
  cutoff_hours: number;
  is_active: boolean;
  is_live: boolean;
  next_start_at: string;
  pickup_location: {
    id: string;
    label: string | null;
    address1: string;
    city: string;
    region: string;
    postal_code: string;
    timezone: string;
  };
};

async function requestOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function cadenceLabel(c: string) {
  if (c === "weekly") return "Weekly";
  if (c === "biweekly") return "Every two weeks";
  if (c === "monthly") return "Monthly";
  return c;
}

async function qrDataUrl(value: string, size: number) {
  const mod = await import("qrcode");
  return await mod.toDataURL(value, {
    margin: 1,
    width: size,
    color: { dark: "#1c1b16", light: "#ffffff" },
  });
}

export default async function BoxQrPosterPage({
  params,
}: {
  params: { planId: string };
}) {
  const planId = params.planId;
  const plan = await requestJSON<Plan>(`/v1/subscription-plans/${planId}`, {
    next: { revalidate: 60 },
  });

  const origin = await requestOrigin();
  const shortUrl = origin ? `${origin}/b/${planId}` : `/b/${planId}`;
  const boxUrl = origin ? `${origin}/boxes/${planId}` : `/boxes/${planId}`;
  const qr = await qrDataUrl(shortUrl, 640);

  const tz = plan.pickup_location.timezone || "UTC";
  const nextStart = new Date(plan.next_start_at);
  const nextLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(nextStart);

  const where = `${plan.pickup_location.address1}, ${plan.pickup_location.city}, ${plan.pickup_location.region} ${plan.pickup_location.postal_code}`;

  return (
    <div className="min-h-[100svh] bg-[linear-gradient(180deg,rgba(255,246,228,0.96),rgba(243,231,200,0.92))] p-6 text-[color:var(--lr-ink)]">
      <div className="mx-auto grid w-full max-w-3xl gap-6">
        <div className="print:hidden">
          <Link
            className="lr-btn lr-chip inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            href={`/boxes/${planId}`}
          >
            <span aria-hidden="true">←</span>
            Back to buyer page
          </Link>
        </div>

        <section className="rounded-[2rem] bg-white/70 p-8 shadow-[0_30px_90px_rgba(38,28,10,0.12)] ring-1 ring-[color:var(--lr-border)] print:shadow-none print:ring-0">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
                LocalRoots
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {plan.title}
              </h1>
              <div className="text-sm text-[color:var(--lr-muted)]">
                {cadenceLabel(plan.cadence)} subscription box
              </div>
              <div className="mt-2 grid gap-1 text-sm">
                <div>
                  <span className="font-semibold">Price:</span>{" "}
                  {formatMoney(plan.price_cents)} + service fee
                </div>
                <div>
                  <span className="font-semibold">Next pickup:</span> {nextLabel}
                </div>
                <div>
                  <span className="font-semibold">Pickup:</span> {where}
                </div>
              </div>
            </div>

            <div className="grid justify-items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Subscribe QR code"
                className="rounded-3xl border border-[color:var(--lr-border)] bg-white p-4"
                style={{ width: 360, height: 360 }}
              />
              <div className="text-center text-sm font-semibold">
                Scan to subscribe
              </div>
              <div className="text-center text-xs text-[color:var(--lr-muted)]">
                Or visit:{" "}
                <span className="font-mono break-all">{shortUrl}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[rgba(47,107,79,0.08)] p-4 text-sm text-[color:var(--lr-ink)] ring-1 ring-[rgba(47,107,79,0.18)]">
            Payment is authorized in advance and captured when pickup is
            confirmed.
          </div>
        </section>

        <PrintPosterActions boxUrl={boxUrl} />
      </div>
    </div>
  );
}
