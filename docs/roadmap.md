# Technical Roadmap

## Completed

### Phase 1: Foundations
- Backend Go service skeleton + `/health`
- Postgres + migrations + schema v1
- Public browse endpoints (stores/windows/offerings)

### Phase 2: Transaction core
- Create orders (one store + pickup window)
- Inventory reservation / decrement (no oversell)

### Phase 3: Payments
- Stripe Connect Express onboarding (embedded, with data pre-fill)
- Card checkout + webhook-driven status transitions
- Webhook idempotency + capture-on-pickup policy
- No-show fee charging + waive option
- Buyer service fee (bps + flat)

### Phase 4: Fulfillment + trust
- Seller marks `ready` / confirms pickup (QR code + 6-digit code)
- Post-fulfillment reviews (1-5 stars + comment)

### Phase 5: Subscriptions
- Subscription plans (weekly/biweekly/monthly cadences)
- Cycle generation (auto-creates pickup windows + orders)
- Deposit support
- Subscription management (pause/resume/cancel, update payment method)

### Phase 6: Auth + notifications
- Seller auth (email/password + Google OAuth)
- Buyer auth (magic link + Google OAuth, unified session)
- Transactional email via Resend (subscription confirm, pickup reminders, order ready)
- Internal cron endpoints for billing authorization + reminder dispatch

### Phase 7: Discovery + onboarding
- Geo store discovery (Google Places autocomplete, radius search, browser geolocation)
- 4-step seller setup wizard (location → box → payouts → review/go-live)
- Embedded Stripe Connect onboarding (replaces popup flow)
- Demo mode with admin-only seed data
- QR code generation for farmstand physical-to-digital bridge

## Next up

### Phase 8: Growth + retention
- Stripe Connect payouts / transfer automation
- Seller dashboard analytics (pickup rate, revenue, subscriber retention)
- Buyer re-engagement (email nudges for lapsed subscribers)
- Multi-location support per store
- Public store profiles / SEO pages
