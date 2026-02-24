import Link from "next/link";
import { api } from "@/lib/api";

function formatWindowLabel(pw: Awaited<ReturnType<typeof api.listStorePickupWindows>>[number]) {
  const tz = pw.pickup_location.timezone || "UTC";
  const start = new Date(pw.start_at);
  const end = new Date(pw.end_at);

  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });

  const tzAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  })
    .formatToParts(start)
    .find((p) => p.type === "timeZoneName")?.value ?? tz;

  return `${day} ${time.format(start)} to ${time.format(end)} (${tzAbbr})`;
}

export default async function StorePickupWindowsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  let windows: Awaited<ReturnType<typeof api.listStorePickupWindows>> | null =
    null;
  let error: string | null = null;
  let storeName: string | null = null;
  let storeDescription: string | null = null;

  try {
    const [windowsResult, storeResult] = await Promise.allSettled([
      api.listStorePickupWindows(storeId),
      api.getStore(storeId),
    ]);
    if (windowsResult.status === "fulfilled") {
      windows = windowsResult.value;
    } else {
      error = windowsResult.reason instanceof Error ? windowsResult.reason.message : "Unknown error";
    }
    if (storeResult.status === "fulfilled") {
      storeName = storeResult.value.name;
      storeDescription = storeResult.value.description;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
            {storeName ?? "Pickup windows"}
          </h1>
          {storeDescription ? (
            <p className="text-sm text-[color:var(--lr-muted)]">
              {storeDescription}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="lr-btn px-4 py-2 text-sm font-semibold text-[color:var(--lr-ink)]"
            href={`/stores/${storeId}/boxes`}
          >
            Seasonal boxes
          </Link>
          <Link
            className="lr-btn lr-btn-primary px-4 py-2 text-sm font-semibold"
            href="/stores"
          >
            Back to stores
          </Link>
        </div>
      </div>

      {error ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load pickup windows
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
        </div>
      ) : null}

      {windows && windows.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">
            No upcoming pickup windows.
          </p>
        </div>
      ) : null}

      {windows && windows.length > 0 ? (
        <ul className="grid gap-3">
          {windows.map((pw) => (
            <li
              key={pw.id}
              className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                    <Link
                      className="hover:underline"
                      href={`/pickup-windows/${pw.id}`}
                    >
                      {formatWindowLabel(pw)}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                    {pw.pickup_location.label
                      ? `${pw.pickup_location.label} · `
                      : ""}
                    {pw.pickup_location.address1}, {pw.pickup_location.city},{" "}
                    {pw.pickup_location.region} {pw.pickup_location.postal_code}
                  </p>
                </div>
                <div className="text-xs text-[color:var(--lr-muted)]">
                  <span className="inline-flex items-center rounded-full px-2 py-1 ring-1 ring-[color:var(--lr-border)]">
                    {pw.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
