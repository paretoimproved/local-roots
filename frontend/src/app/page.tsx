import Link from "next/link";

export default function Home() {
  return (
    <div className="grid gap-12">
      {/* Buyer hero */}
      <section className="lr-card lr-card-strong lr-animate p-8">
        <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Fresh food from local farmers.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--lr-muted)]">
          Subscribe to a weekly farm box, then pick it up at a time that works
          for you. Real food from people nearby — no shipping, no middlemen.
        </p>
        <div className="mt-6">
          <Link
            className="lr-btn lr-btn-primary inline-flex items-center justify-center px-5 py-2 text-sm font-medium"
            href="/stores"
          >
            Find a farm near you
          </Link>
        </div>
      </section>

      {/* Seller pitch */}
      <section className="lr-card lr-animate p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--lr-ink)]">
          Sell your harvest. Zero platform fees.
        </h2>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--lr-muted)]">
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
