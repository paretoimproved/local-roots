# TODOS

Deferred work items tracked for future implementation.

---

## ~~P2: "Next pickup" date badge on store cards~~ → PROMOTED to Eugene launch scope (E1)

Moved to active scope in Eugene soft launch plan (2026-03-22). See CEO plan for details.

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

---

## P2: Partial refund support

**What:** Extend the seller-initiated refund flow to support partial refunds (specific dollar amount rather than full order refund).

**Why:** Post-launch, sellers will need to handle situations where a box was partially wrong (e.g., missing item, substituted item). Full refund is too heavy-handed; partial refund lets the seller make it right proportionally.

**Pros:** Better dispute resolution, preserves buyer trust without full revenue loss for sellers.

**Cons:** Slightly more complex UI (amount input vs. single button). Stripe Refund API already supports amounts — backend work is minimal.

**Context:** The B2 refund flow (Eugene launch) ships with full-refund-only. The `Refund` method in `stripepay.go` accepts `amountCents` — just needs a frontend amount input and validation. Guard against refunding more than the original charge.

**Effort:** S (human: ~4h / CC: ~15 min)

**Priority:** P2

**Depends on / blocked by:** B2 (seller-initiated refund flow) must ship first.

**Source:** CEO plan review 2026-03-22, Eugene soft launch.

---

## P3: Refresh token cleanup cron

**What:** Add a scheduled job to delete expired and used refresh tokens from the `refresh_tokens` table.

**Why:** The refresh_tokens table accumulates rows as users authenticate. Without cleanup, it grows indefinitely. At soft-launch scale this is harmless, but should be addressed before scaling.

**Pros:** Prevents table bloat, keeps queries fast.

**Cons:** Minimal — just a periodic DELETE query.

**Context:** Query: `DELETE FROM refresh_tokens WHERE expires_at < now() OR (used = true AND updated_at < now() - interval '1 day')`. Can run on the existing in-process scheduler (like billing and reminder crons). Daily frequency is sufficient.

**Effort:** S (human: ~2h / CC: ~10 min)

**Priority:** P3

**Depends on / blocked by:** B4 (refresh token rotation) must ship first.

**Source:** CEO plan review 2026-03-22, Eugene soft launch.

---

## P2: Buyer-initiated refund requests

**What:** Allow buyers to request a refund through the platform (not just via support email). Seller reviews and approves/denies. Platform admin can mediate disputes.

**Why:** Currently only sellers can initiate refunds. Buyers who receive a bad box or miss a pickup due to seller no-show have no self-service path — they must email support. As the platform grows beyond white-glove support, this becomes a support bottleneck.

**Pros:** Reduces support load, gives buyers a clear path to resolution, creates an audit trail for disputes.

**Cons:** Requires UI on both buyer and seller sides, notification flow, and potentially admin mediation UI. More complex than seller-only refunds.

**Context:** Build on B2's refund infrastructure. New endpoint: `POST /v1/orders/{orderId}/refund-request`. Seller sees request on dashboard, approves (triggers B2 refund) or denies (buyer notified). If disputed, admin mediates via admin dashboard. Needs a `refund_requests` table.

**Effort:** M (human: ~2 weeks / CC: ~2 hours)

**Priority:** P2

**Depends on / blocked by:** B2 (refund flow) + B3 (admin dashboard) must ship first. Best built after real user feedback confirms the need.

**Source:** CEO plan review 2026-03-22, Eugene soft launch.
