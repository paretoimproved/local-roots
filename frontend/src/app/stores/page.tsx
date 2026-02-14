import Link from "next/link";
import { api } from "@/lib/api";

export default async function StoresPage() {
  let stores: Awaited<ReturnType<typeof api.listStores>> | null = null;
  let error: string | null = null;

  try {
    stores = await api.listStores();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Stores</h1>
        <p className="text-sm text-zinc-600">
          {stores ? `${stores.length} active` : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm font-medium text-zinc-950">
            Could not load stores
          </p>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
          <p className="mt-3 text-sm text-zinc-600">
            If you have not set up Postgres yet, start it and run migrations:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-50">
            <code>{`docker compose up -d
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up`}</code>
          </pre>
        </div>
      ) : null}

      {stores && stores.length === 0 ? (
        <div className="rounded-xl bg-white p-6 ring-1 ring-zinc-950/5">
          <p className="text-sm text-zinc-600">No stores yet.</p>
        </div>
      ) : null}

      {stores && stores.length > 0 ? (
        <ul className="grid gap-3">
          {stores.map((s) => (
            <li
              key={s.id}
              className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">
                    <Link className="hover:underline" href={`/stores/${s.id}`}>
                      {s.name}
                    </Link>
                  </h2>
                  {s.description ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      {s.description}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs text-zinc-500">
                  Added {new Date(s.created_at).toLocaleDateString("en-US")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

