# Changelog

All notable changes to this project will be documented in this file.

## [0.8.0.0] - 2026-03-21

### Added
- Seller analytics dashboard: active subscribers, pickup rate, revenue, avg rating, retention, no-show rate, churn, top products, revenue by cycle, subscriber trend with 4-week delta arrow, and payout history with transfer status chips
- Lapsed subscriber re-engagement cron: nudge emails for subscribers who haven't picked up in 2+ cycles (idempotent, 14-day cooldown)
- Post-pickup review prompt cron: emails buyers 2+ hours after pickup if no review exists
- Seller weekly digest cron: store metrics summary (subscribers, pickups, revenue) sent to sellers with active stores
- Subscriber milestone celebration cron: emails at 5, 10, 25, 50 pickups (idempotent via milestone_emails table)
- Transfer retry cron: retries failed Stripe Connect transfers up to 3 attempts with error tracking
- City landing pages (`/farms/[city]`) with SEO metadata, JSON-LD structured data, store grid, and cross-city navigation
- Dynamic sitemap.ts including store and city routes
- robots.ts for search engine crawling
- OG image generation for store pages (edge runtime, `next/og`)
- Waitlist email capture on stores page (POST /v1/waitlist with lat/lng)
- Public store profiles: enhanced store detail page with JSON-LD LocalBusiness schema
- Waitlist notification email template for new farm alerts
- DB migrations: reengagement tracking (0027), review prompt tracking (0028), transfer failure tracking (0029), milestone emails (0030), waitlist (0031)

### Changed
- Store detail page: added JSON-LD structured data and OG metadata
- Seller store dashboard: added Analytics link in header
- Analytics page: responsive grid for secondary metrics on mobile

### Fixed
- Removed unused `buyer_name` field from reengagement SQL query (dead variable)
- Removed `showToast` from analytics useEffect deps to prevent infinite re-render loop
