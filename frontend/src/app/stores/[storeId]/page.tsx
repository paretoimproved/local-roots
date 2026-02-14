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

  return `${day} ${time.format(start)} to ${time.format(end)} (${tz})`;
}

export default async function StorePickupWindowsPage({
  params,
}: {
  params: { storeId: string };
}) {
  const { storeId } = params;

  let windows: Awaited<ReturnType<typeof api.listStorePickupWindows>> | null =
    null;
  let error: string | null = null;

  try {
    windows = await api.listStorePickupWindows(storeId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pickup windows</h1>
          <p className="text-sm text-zinc-600">Store: {storeId}</p>
        </div>
        <Link className="text-sm text-zinc-600 hover:text-zinc-950" href="/stores">
          Back to stores
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm font-medium text-zinc-950">
            Could not load pickup windows
          </p>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
        </div>
      ) : null}

      {windows && windows.length === 0 ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm text-zinc-600">No upcoming pickup windows.</p>
        </div>
      ) : null}

      {windows && windows.length > 0 ? (
        <ul className="grid gap-3">
          {windows.map((pw) => (
            <li
              key={pw.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">
                    <Link
                      className="hover:underline"
                      href={`/pickup-windows/${pw.id}`}
                    >
                      {formatWindowLabel(pw)}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    {pw.pickup_location.label
                      ? `${pw.pickup_location.label} · `
                      : ""}
                    {pw.pickup_location.address1}, {pw.pickup_location.city},{" "}
                    {pw.pickup_location.region} {pw.pickup_location.postal_code}
                  </p>
                </div>
                <div className="text-xs text-zinc-500">Status: {pw.status}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
