import Link from "next/link";
import Image from "next/image";
import { api, type Store } from "@/lib/api";

async function getFeaturedStores(): Promise<Store[]> {
  try {
    const stores = await api.listStores();
    return stores.slice(0, 3);
  } catch {
    return [];
  }
}

export default async function Home() {
  const featuredStores = await getFeaturedStores();

  return (
    <div className="grid gap-16">
      {/* Hero */}
      <section className="lr-card lr-card-strong lr-animate relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1400&q=80"
            alt="Fresh farm produce"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1024px"
            priority
          />
          <div className="absolute inset-0 bg-[color:var(--lr-ink)]/60" />
        </div>

        <div className="relative z-10 px-8 py-20 sm:px-12 sm:py-28">
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl font-[family-name:var(--font-lr-serif)]">
            Fresh food from local farmers.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">
            Subscribe to a weekly farm box, then pick it up at a time that works
            for you. Real food from people nearby — no shipping, no middlemen.
          </p>
          <div className="mt-8">
            <Link
              className="lr-btn lr-btn-primary inline-flex items-center justify-center px-6 py-3 text-sm font-medium"
              href="/stores"
            >
              Find a farm near you
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lr-animate grid gap-8">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: 1,
              title: "Find a local farm",
              description:
                "Browse farms near you and discover what's in season.",
            },
            {
              step: 2,
              title: "Subscribe to a box",
              description:
                "Choose a weekly, biweekly, or monthly box that fits your household.",
            },
            {
              step: 3,
              title: "Pick it up fresh",
              description:
                "Grab your box at the farmstand — no shipping, no hassle.",
            },
          ].map((item) => (
            <div key={item.step} className="lr-card p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--lr-leaf)]/10 text-sm font-bold text-[color:var(--lr-leaf)]">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--lr-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--lr-muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured farms */}
      {featuredStores.length > 0 && (
        <section className="lr-animate grid gap-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
              Featured farms
            </h2>
            <p className="mt-2 text-sm text-[color:var(--lr-muted)]">
              Discover farms already selling on LocalRoots.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featuredStores.map((s) => (
              <Link
                key={s.id}
                href={`/stores/${s.id}`}
                className="lr-card lr-card-strong overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]"
              >
                {s.image_url ? (
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={s.image_url}
                      alt={s.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-[color:var(--lr-leaf)]/5">
                    <span className="text-3xl text-[color:var(--lr-leaf)]/30">
                      {s.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-[color:var(--lr-ink)]">
                    {s.name}
                  </h3>
                  {(s.city || s.region) && (
                    <p className="mt-1 text-xs text-[color:var(--lr-muted)]">
                      {[s.city, s.region].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[color:var(--lr-muted)]">
                      {s.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/stores"
              className="lr-btn inline-flex items-center justify-center px-5 py-2 text-sm font-medium text-[color:var(--lr-ink)]"
            >
              View all farms
            </Link>
          </div>
        </section>
      )}

      {/* Seller pitch */}
      <section className="lr-card lr-animate p-8 text-center sm:px-12 sm:py-10">
        <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Sell your harvest. Zero platform fees.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-[color:var(--lr-muted)]">
          Set up a farm store in minutes. Publish pickup windows, manage
          subscribers, and get paid directly through Stripe. Buyers cover a
          small service fee — it costs you nothing.
        </p>
        <div className="mt-6">
          <Link
            className="lr-btn lr-btn-primary inline-flex items-center justify-center px-5 py-2 text-sm font-medium"
            href="/seller/register"
          >
            Start selling
          </Link>
        </div>
      </section>
    </div>
  );
}
