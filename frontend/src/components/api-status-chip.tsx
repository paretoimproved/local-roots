"use client";

import { useEffect, useMemo, useState } from "react";

type ApiStatus = "checking" | "online" | "offline";

export function ApiStatusChip() {
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
    [],
  );
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 3000);

    fetch(`${apiBase}/health`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((data: unknown) => {
        const ok =
          typeof data === "object" &&
          data !== null &&
          "ok" in data &&
          (data as { ok: unknown }).ok === true;
        setStatus(ok ? "online" : "offline");
      })
      .catch(() => setStatus("offline"))
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, [apiBase]);

  const label =
    status === "checking"
      ? "API: checking"
      : status === "online"
        ? "API: online"
        : "API: offline";

  const dotClass =
    status === "online"
      ? "bg-emerald-500"
      : status === "offline"
        ? "bg-rose-500"
        : "bg-zinc-400";

  return (
    <a
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-800 ring-1 ring-zinc-950/15 hover:bg-zinc-50"
      href={`${apiBase}/health`}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} (opens health endpoint)`}
      title="Open API health endpoint"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

