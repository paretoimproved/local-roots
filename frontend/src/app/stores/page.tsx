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
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Stores
        </h1>
        <p className="text-sm text-[color:var(--lr-muted)]">
          {stores ? `${stores.length} active` : ""}
        </p>
      </div>

      {error ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm font-medium text-[color:var(--lr-ink)]">
            Could not load stores
          </p>
          <p className="mt-2 text-sm text-[color:var(--lr-muted)]">{error}</p>
          <p className="mt-3 text-sm text-[color:var(--lr-muted)]">
            If you have not set up Postgres yet, start it and run migrations:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-2xl border border-[color:var(--lr-border)] bg-[color:var(--lr-ink)] p-4 text-xs text-[color:var(--lr-bg)] shadow-[0_18px_45px_rgba(38,28,10,0.18)]">
            <code>{`docker compose up -d
export DATABASE_URL="postgres://localroots:localroots@localhost:5432/localroots?sslmode=disable"
pnpm migrate:up`}</code>
          </pre>
        </div>
      ) : null}

      {stores && stores.length === 0 ? (
        <div className="lr-card lr-card-strong p-6">
          <p className="text-sm text-[color:var(--lr-muted)]">No stores yet.</p>
        </div>
      ) : null}

      {stores && stores.length > 0 ? (
        <ul className="grid gap-3">
          {stores.map((s) => (
            <li
              key={s.id}
              className="lr-card lr-card-strong p-6 transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--lr-ink)]">
                    <Link className="hover:underline" href={`/stores/${s.id}`}>
                      {s.name}
                    </Link>
                  </h2>
                  {s.description ? (
                    <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
                      {s.description}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs text-[color:var(--lr-muted)]">
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
