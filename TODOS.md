# TODOS

Deferred work items tracked for future implementation.

---

## P2: "Next pickup" date badge on store cards

**What:** Show "Next pickup: Sat Mar 22" on each store card in `/stores` browse results and city landing pages.

**Why:** Growth audit flagged pickup date as a top purchase signal — knowing *when* you can get food drives action. Currently buyers must click into a store to see pickup dates.

**Pros:** Surfaces purchase-intent data earlier in the funnel, reduces unnecessary click-throughs, increases qualified traffic to store detail pages.

**Cons:** Requires an additional query per store (next published pickup window) — minor performance cost.

**Context:** Backend needs to include `next_pickup_date` in the store list response by querying upcoming published windows for each store. Frontend renders it as a badge on `StoreCard`. The `pickup_windows` table already has `start_at` and `status` columns. Could use a lateral join or subquery in the existing `ListStores` query.

**Effort:** S (human: ~4h / CC: ~10 min)

**Priority:** P2

**Depends on / blocked by:** None. Can be done independently of Phase 8.

**Source:** CEO plan review 2026-03-18, Phase 8 deferred item.

---

## P3: Formalize design system into DESIGN.md

**What:** Run `/design-consultation` to document the implicit design language (tokens, component classes, typography scale, spacing, color usage) into a formal `DESIGN.md` file.

**Why:** The design system is currently implicit — spread across `globals.css` CSS variables and component patterns. As the codebase grows (Phase 8 adds 4+ new UI surfaces), design drift becomes likely without a single source of truth. New contributors won't know which tokens to use or which patterns to follow.

**Pros:** Prevents design drift, speeds up future UI work, enables design review automation against documented patterns, makes onboarding easier.

**Cons:** Maintenance overhead of keeping the doc in sync. Low risk since the design language is already stable.

**Context:** Existing tokens: `--lr-bg`, `--lr-ink`, `--lr-muted`, `--lr-leaf`, `--lr-clay`, `--lr-water`. Component classes: `lr-card`, `lr-card-strong`, `lr-btn`, `lr-btn-primary`, `lr-chip`, `lr-field`. Typography: 3xl page headings, base section headings, xs uppercase labels, sm body. Hover lift: `hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(38,28,10,0.14)]`. The `/design-consultation` skill can analyze the codebase and produce the doc.

**Effort:** S (human: ~2h / CC: ~20 min)

**Priority:** P3

**Depends on / blocked by:** None. Can be done independently. Best done after Phase 8 ships so the doc captures all patterns.

**Source:** Design review 2026-03-21, Phase 8 plan.
