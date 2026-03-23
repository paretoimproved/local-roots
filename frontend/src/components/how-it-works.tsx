export function HowItWorks() {
  return (
    <section className="grid gap-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
        How it works
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="grid gap-2">
          <h3 className="font-serif text-lg text-[color:var(--lr-ink)]">
            1. Subscribe
          </h3>
          <p className="text-base text-[color:var(--lr-muted)]">
            Choose a farm box that fits your schedule and budget.
          </p>
        </div>
        <div className="grid gap-2">
          <h3 className="font-serif text-lg text-[color:var(--lr-ink)]">
            2. Pick up
          </h3>
          <p className="text-base text-[color:var(--lr-muted)]">
            Grab your fresh box at the farm on your pickup day.
          </p>
        </div>
        <div className="grid gap-2">
          <h3 className="font-serif text-lg text-[color:var(--lr-ink)]">
            3. Enjoy
          </h3>
          <p className="text-base text-[color:var(--lr-muted)]">
            Seasonal, local food from a farmer you trust — on repeat.
          </p>
        </div>
      </div>
    </section>
  );
}
