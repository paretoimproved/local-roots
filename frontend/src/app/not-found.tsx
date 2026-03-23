import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="lr-card lr-card-strong lr-animate mx-auto max-w-md p-8 text-center">
        <h1 className="font-serif text-2xl text-[color:var(--lr-ink)]">
          Page not found
        </h1>
        <p className="mt-3 text-[color:var(--lr-muted)]">
          Looking for local food? Browse farms near you.
        </p>
        <div className="mt-6">
          <Link href="/stores" className="lr-btn lr-btn-primary px-5 py-2 text-sm font-semibold">
            Browse Farms
          </Link>
        </div>
      </div>
    </main>
  );
}
