# Security Audit Report -- Local-Roots Webapp

**Date:** 2026-02-27
**Auditor:** Security Engineer (Claude Opus 4.6)
**Scope:** Full monorepo -- `backend/` (Go + PostgreSQL), `frontend/` (Next.js App Router + React), `e2e/` (Playwright)
**Classification:** READ-ONLY audit, no code modifications

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Findings](#critical-findings)
3. [High Severity Findings](#high-severity-findings)
4. [Medium Severity Findings](#medium-severity-findings)
5. [Low Severity Findings](#low-severity-findings)
6. [Informational Findings](#informational-findings)
7. [Areas of Strong Security Practice](#areas-of-strong-security-practice)
8. [Overall Security Posture Assessment](#overall-security-posture-assessment)

---

## Executive Summary

The Local-Roots application demonstrates generally competent security engineering for an early-stage product. The backend uses parameterized queries throughout (eliminating SQL injection), JWT authentication is properly implemented with HMAC-SHA256 and expiration, Stripe webhook signatures are verified, and CORS is strictly locked down in production.

However, the audit identified **2 critical**, **5 high**, **7 medium**, **4 low**, and **5 informational** findings that require attention. The most severe issues involve Stripe API query injection via unsanitized email input, sensitive environment files left on disk (not committed but present in the working tree), an excessively long JWT TTL, missing password complexity enforcement, and several endpoints lacking rate limiting.

---

## Critical Findings

### C-1: Stripe Customer Search Query Injection via Email

**Severity:** Critical
**Location:** `backend/internal/payments/stripepay/stripepay.go:36`
**OWASP Category:** A03:2021 - Injection

**Description:**
The `FindOrCreateCustomer` method constructs a Stripe customer search query using raw string interpolation:

```go
searchParams.Query = fmt.Sprintf("email:'%s'", email)
```

A buyer provides their email at checkout. If an attacker submits an email containing single quotes or Stripe search operators (e.g., `test'OR email~'*`), this could manipulate the Stripe search query to return a different customer's record. The attacker's payment would then be associated with another customer's Stripe account, potentially allowing them to use that customer's saved payment methods for future off-session charges.

**Impact:**
- A crafted email string could cause the Stripe search to match an unintended customer, linking an attacker to another user's Stripe customer profile.
- Could enable unauthorized use of another buyer's saved payment methods for off-session subscription billing.

**Remediation:**
1. Sanitize the email before interpolation -- strip or escape single quotes and any Stripe search operator characters.
2. Better yet, use the Stripe List API with exact-match `email` filter instead of the Search API, which avoids query language entirely:
   ```go
   params := &stripe.CustomerListParams{}
   params.Filters.AddFilter("email", "", email)
   ```
3. Always validate the email format more strictly (RFC 5322 compliant regex) before passing it to Stripe.

---

### C-2: Sensitive Environment Files Present on Disk

**Severity:** Critical
**Location:**
- `.env.vercel.tmp` (repo root)
- `.env.prod.tmp` (repo root)
- `frontend/.vercel/.env.production.local`
- `e2e/.env`

**OWASP Category:** A02:2021 - Cryptographic Failures / Sensitive Data Exposure

**Description:**
Multiple `.env*` files exist in the working tree containing secrets and production credentials:

- `.env.prod.tmp:3` -- Production backend Railway URL exposed
- `.env.prod.tmp:6` -- Google OAuth Client ID
- `.env.prod.tmp:7` -- Stripe test publishable key
- `.env.vercel.tmp:2` -- Clerk secret key (truncated but present)
- `.env.prod.tmp:27` -- Vercel OIDC JWT token
- `e2e/.env:2-3` -- Production API URL and Stripe publishable key

While these files are NOT tracked in git (confirmed via `git ls-files --error-unmatch`), they exist on disk and could be accidentally committed, leaked through backup tools, or exposed via IDE synchronization services. The `.gitignore` covers `.env` and `.env.local` but does NOT explicitly cover patterns like `.env.*.tmp`.

**Impact:**
- If accidentally committed, Stripe keys, Clerk secrets, and Vercel OIDC tokens would be exposed in the repository history.
- Anyone with local filesystem access can read these credentials.

**Remediation:**
1. **Delete** `.env.vercel.tmp` and `.env.prod.tmp` immediately -- these appear to be leftover Vercel CLI artifacts.
2. Add `*.tmp` and `.env.*.tmp` patterns explicitly to `.gitignore`.
3. Rotate any credentials found in these files as a precaution (especially the Clerk secret key and Vercel OIDC tokens).
4. Consider using a secrets manager (e.g., Doppler, 1Password Secrets Automation) instead of local env files for production credentials.

---

## High Severity Findings

### H-1: Excessively Long JWT Token Lifetime (30 Days)

**Severity:** High
**Location:**
- `backend/internal/api/v1/auth.go:97` (seller register)
- `backend/internal/api/v1/auth.go:160` (seller login)
- `backend/internal/api/v1/buyer_auth.go:169` (buyer magic link verify)
- `backend/internal/api/v1/oauth.go:195` (OAuth issueToken)

**OWASP Category:** A07:2021 - Identification and Authentication Failures

**Description:**
All JWT tokens are issued with a 30-day TTL:

```go
auth.SignJWT([]byte(a.JWTSecret), u.ID, u.Role, 30*24*time.Hour)
```

There is no refresh token mechanism, no token revocation capability, and no JWT blacklist. If a token is compromised, it remains valid for up to 30 days. The `RequireUser` middleware does re-check the user exists in the database on every request (good), but it does not check if the user's password was changed, if the user was deactivated, or if the token was explicitly revoked.

**Impact:**
- Stolen tokens (via XSS, local storage theft, network interception) grant 30-day access.
- No way to force logout a compromised user.
- Role changes (e.g., buyer upgraded to seller) in existing tokens remain valid until expiration.

**Remediation:**
1. Reduce JWT TTL to 1-4 hours for access tokens.
2. Implement a refresh token mechanism with secure HTTP-only cookies.
3. Add a `password_changed_at` or `token_version` column to the `users` table, embed the version in the JWT, and reject tokens issued before the latest version.
4. As a short-term measure, add a `revoked_at` timestamp column and check it in `RequireUser`.

---

### H-2: No Minimum Entropy or Complexity Requirement for JWT_SECRET

**Severity:** High
**Location:** `backend/internal/config/config.go:43`

**OWASP Category:** A02:2021 - Cryptographic Failures

**Description:**
The `JWT_SECRET` is loaded directly from the environment with no validation of length or entropy:

```go
jwtSecret := os.Getenv("JWT_SECRET")
```

If a weak secret is configured (e.g., `"secret"`, `"password"`), the HMAC-SHA256 JWTs can be trivially forged by brute force. The application does check `strings.TrimSpace(a.JWTSecret) == ""` before using it, but accepts any non-empty string.

**Impact:**
- A weak JWT secret allows an attacker to forge valid JWT tokens for any user, including admin users.
- Complete authentication bypass.

**Remediation:**
1. Add a startup validation that rejects `JWT_SECRET` values shorter than 32 characters.
2. Log a warning or refuse to start if the secret appears to be a common weak value.
3. Document the requirement for a cryptographically random secret (e.g., `openssl rand -hex 32`).

---

### H-3: Missing Rate Limiting on Order Creation and Multiple Buyer Endpoints

**Severity:** High
**Location:** `backend/internal/httpx/handler.go:64-76`

**OWASP Category:** A04:2021 - Insecure Design

**Description:**
The following endpoints lack rate limiting:

- `POST /v1/pickup-windows/{pickupWindowId}/orders` (order creation) -- line 64
- `GET /v1/orders/{orderId}` (buyer order view) -- line 75
- `POST /v1/orders/{orderId}/review` (review creation) -- line 76
- `GET /v1/subscriptions/{subscriptionId}` -- line 79
- `POST /v1/subscriptions/{subscriptionId}/status` -- line 80
- `POST /v1/subscriptions/{subscriptionId}/payment-method/setup` -- line 81
- `POST /v1/subscriptions/{subscriptionId}/payment-method/confirm` -- line 82
- All seller CRUD endpoints (stores, locations, windows, products, offerings)
- `GET /v1/places/autocomplete` and `GET /v1/geocode` (public geo endpoints)

While the checkout and auth endpoints are rate-limited, the order creation endpoint is not, allowing an attacker to spam order creation attempts. The public geo endpoints proxy to Google Places API with no rate limiting, making the application a free proxy for Google Places API abuse.

**Impact:**
- Order creation spam could exhaust inventory reservations (DoS).
- Unrestricted Google Places API proxy could result in significant billing charges.
- Review spam (though limited to picked-up orders, the endpoint could be hammered).

**Remediation:**
1. Apply the "checkout" rate limit tier to `POST /v1/pickup-windows/{pickupWindowId}/orders`.
2. Apply the "default" tier to all remaining unprotected endpoints.
3. Create a dedicated "geo" tier with stricter limits (e.g., 20/min) for public geocoding endpoints.
4. Consider adding per-user rate limiting (not just per-IP) for authenticated endpoints.

---

### H-4: Buyer Token in URL Query Parameters (Token Leakage via Referrer)

**Severity:** High
**Location:**
- `backend/internal/api/v1/orders.go:368` -- `orderURL := fmt.Sprintf("%s/orders/%s?t=%s", ...)`
- `backend/internal/api/v1/seller_orders.go:363` -- `orderURL := ... + "?t=" + info.buyerToken`
- `backend/internal/api/v1/subscriptions.go:784` -- `manageURL := ... + "?t=" + sub.BuyerToken`
- `backend/internal/api/v1/internal_email.go:109` -- `orderURL := ... + "?t=" + rem.buyerToken`

**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
Buyer authentication tokens (`buyer_token`) are embedded as query parameters (`?t=`) in URLs sent via email and used in the frontend. These tokens appear in:

1. Browser address bars (shoulder surfing risk)
2. Browser history
3. HTTP `Referer` headers when the buyer clicks any external link from the order/subscription page
4. Server access logs
5. Any analytics or tracking tools that capture full URLs

These tokens grant full access to view orders, view subscriptions, create reviews, cancel subscriptions, and update payment methods.

**Impact:**
- Token leakage via Referer headers to any third-party resource loaded on the page.
- Persistent exposure in browser history and server logs.
- Anyone with the URL can access the buyer's order/subscription details and perform actions.

**Remediation:**
1. Use short-lived, single-use tokens for email links that exchange for a session cookie upon first access.
2. Set `Referrer-Policy: no-referrer` or `same-origin` on all buyer-facing pages.
3. Move token-based auth from query parameters to POST bodies or HTTP-only cookies.
4. Add the `rel="noreferrer"` attribute to all external links on buyer pages.

---

### H-5: No Brute Force Protection on Pickup Code Verification

**Severity:** High
**Location:**
- `backend/internal/api/v1/seller_orders.go:464` -- `pickupCode != in.PickupCode`
- `backend/internal/api/v1/pickup_confirm.go:255` -- `pickupCode != in.PickupCode`

**OWASP Category:** A07:2021 - Identification and Authentication Failures

**Description:**
Pickup codes are used to confirm order handoff. The confirmation endpoints (`ConfirmPickup` and `PickupConfirmAPI.Confirm`) compare the submitted code against the stored code with no rate limiting on attempts, no lockout after failed attempts, and no delay. If pickup codes are short or predictable (e.g., 4-6 alphanumeric characters), an attacker could brute-force a valid code.

Additionally, the pickup confirmation endpoints are only gated behind `RequireUser` (any authenticated seller), not rate-limited per order. A compromised seller account could rapidly try codes for orders at other stores.

**Impact:**
- Brute-force of pickup codes could allow unauthorized pickup confirmation and payment capture.
- Financial loss for buyers whose orders are marked as picked up without actual delivery.

**Remediation:**
1. Apply rate limiting to pickup confirmation endpoints (e.g., 5 attempts per minute per order).
2. Implement progressive delays or lockouts after 3-5 failed pickup code attempts per order.
3. Ensure pickup codes have sufficient entropy (at least 6 alphanumeric characters = ~2.17 billion combinations).
4. Log failed pickup code attempts for monitoring.

---

## Medium Severity Findings

### M-1: No CSRF Protection for State-Changing Operations

**Severity:** Medium
**Location:** All `POST`/`PATCH`/`DELETE` endpoints in `backend/internal/httpx/handler.go`

**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
The API uses Bearer token authentication via the `Authorization` header, which inherently prevents CSRF for endpoints that require it. However, several state-changing endpoints accept authentication via:
- Query parameter `?t=` (buyer token) -- these ARE vulnerable to CSRF
- Request body `token` field (review creation)

Since CORS is configured with `Access-Control-Allow-Credentials: true`, and buyer tokens are passed in URLs that may be bookmarked, the browser could be tricked into sending credentialed requests to the API.

**Impact:**
- Limited CSRF risk for buyer-authenticated actions (subscription cancellation, review creation).
- The risk is mitigated by the fact that buyer tokens are opaque (not cookies), but URL-based tokens could be exploited.

**Remediation:**
1. Require Bearer token in the Authorization header for all state-changing operations.
2. Remove support for token-in-query-parameter for POST endpoints.
3. Consider implementing `SameSite` cookie-based sessions as an alternative.

---

### M-2: Password Policy Too Weak

**Severity:** Medium
**Location:** `backend/internal/api/v1/auth.go:61`

**OWASP Category:** A07:2021 - Identification and Authentication Failures

**Description:**
The only password requirement is a minimum length of 8 characters:

```go
if len(in.Password) < 8 {
    resp.BadRequest(w, "password must be at least 8 characters")
    return
}
```

There is no check for:
- Maximum password length (bcrypt has a 72-byte limit but the code does not enforce or warn)
- Common/breached password lists
- Character diversity requirements
- Password reuse prevention

**Impact:**
- Users can set trivially guessable passwords like `password`, `12345678`, or `aaaaaaaa`.
- Credential stuffing and dictionary attacks become more effective.

**Remediation:**
1. Add a maximum password length check (72 characters for bcrypt compatibility).
2. Integrate a breached password check (e.g., HaveIBeenPwned k-anonymity API).
3. At minimum, require at least one letter and one number.
4. Consider using zxcvbn-style strength estimation.

---

### M-3: Missing Security Headers

**Severity:** Medium
**Location:** `backend/internal/httpx/handler.go` (no security header middleware)

**OWASP Category:** A05:2021 - Security Misconfiguration

**Description:**
The API does not set standard security headers:
- No `Strict-Transport-Security` (HSTS)
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options: DENY`
- No `Content-Security-Policy`
- No `Referrer-Policy`

While the frontend is on Vercel (which may add some headers), the API responses themselves lack these protections. The API returns JSON, so XSS via API responses is unlikely, but HSTS and nosniff should still be set.

**Impact:**
- Missing HSTS allows SSL-stripping attacks.
- Missing nosniff could allow MIME-type confusion in older browsers.
- Missing Referrer-Policy exacerbates the H-4 token leakage issue.

**Remediation:**
Add a security headers middleware to `withLogging` or `withCORS`:
```go
w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
w.Header().Set("X-Content-Type-Options", "nosniff")
w.Header().Set("X-Frame-Options", "DENY")
w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
```

---

### M-4: Internal Cron Secret Uses Simple String Comparison

**Severity:** Medium
**Location:**
- `backend/internal/api/v1/internal_billing.go:216-233`
- `backend/internal/api/v1/internal_email.go:155-172`

**OWASP Category:** A02:2021 - Cryptographic Failures

**Description:**
The `requireSecret` function uses direct string comparison:

```go
if strings.TrimSpace(parts[1]) != secret {
    resp.Unauthorized(w, "invalid token")
    return false
}
```

This is vulnerable to timing attacks. While the practical exploitability is low (the internal endpoints are meant to be called by scheduled jobs, not exposed publicly), using `crypto/subtle.ConstantTimeCompare` is a best practice.

Additionally, if `INTERNAL_CRON_SECRET` is not set, the internal endpoints return a 503 (service unavailable) rather than a 401, which is correct behavior but worth noting.

**Impact:**
- Theoretical timing attack could allow an attacker to determine the secret one character at a time.
- Practical risk is low since these endpoints require network access to the backend.

**Remediation:**
Replace the string comparison with:
```go
if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(parts[1])), []byte(secret)) != 1 {
    resp.Unauthorized(w, "invalid token")
    return false
}
```

---

### M-5: Role Escalation via Google OAuth -- Buyer Can Self-Upgrade to Seller

**Severity:** Medium
**Location:** `backend/internal/api/v1/oauth.go:91-93` and `oauth.go:129-132`

**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
The Google OAuth login endpoint allows a buyer to self-upgrade to a seller role by passing `role: "seller"` in the request:

```go
// Upgrade buyer->seller if requested.
if role == "seller" && u.Role == "buyer" {
    _, _ = o.DB.Exec(ctx, `UPDATE users SET role = 'seller' WHERE id = $1::uuid`, u.ID)
    u.Role = "seller"
}
```

This happens automatically on any Google login where `role=seller` is passed, with no additional verification, approval process, or admin review.

**Impact:**
- Any buyer can unilaterally become a seller by re-authenticating via Google OAuth with `role: "seller"`.
- While this may be intentional for the MVP (to reduce friction), it bypasses any potential seller vetting process.

**Remediation:**
1. If seller self-registration is intended, document this as accepted risk.
2. If not, remove the auto-upgrade logic and require explicit seller registration.
3. Consider adding an admin approval step for role upgrades.

---

### M-6: Supabase Storage Uploads Lack Server-Side Authorization

**Severity:** Medium
**Location:** `frontend/src/components/seller/image-upload.tsx:56-73`

**OWASP Category:** A01:2021 - Broken Access Control

**Description:**
Image uploads go directly from the browser to Supabase Storage using the `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The upload path is constructed from a `storagePath` prop:

```tsx
const path = `${fullPath}.${ext}`;
await supabase.storage.from("images").upload(path, file, { upsert: true });
```

The `storagePath` is provided by the parent component and typically includes the store ID. However:
1. The Supabase anon key allows any authenticated request to upload to the `images` bucket.
2. There is no server-side validation that the uploader owns the store they are uploading for.
3. The `upsert: true` flag means any upload can overwrite existing images.

The security relies entirely on Supabase bucket policies (RLS), which were not auditable in this review.

**Impact:**
- If Supabase RLS is misconfigured, any browser user could upload/overwrite images.
- Potential for malicious content upload (though restricted to JPEG, PNG, WebP on the client side -- easily bypassed).

**Remediation:**
1. Implement server-side upload: have the frontend send images to the Go backend, which validates ownership and uploads to Supabase using a service role key.
2. Alternatively, use Supabase signed upload URLs generated by the backend after verifying store ownership.
3. Configure strict Supabase Storage RLS policies.
4. Add server-side MIME type validation (do not rely on client-side checks).

---

### M-7: Goroutines Use Expired Request Context for Email Notifications

**Severity:** Medium
**Location:**
- `backend/internal/api/v1/orders.go:373-386` -- `go func() { ... a.DB.QueryRow(ctx, ...) ... }()`
- `backend/internal/api/v1/subscriptions.go:803-816` -- `go func() { ... a.DB.QueryRow(ctx, ...) ... }()`

**OWASP Category:** A04:2021 - Insecure Design

**Description:**
Several fire-and-forget goroutines for sending email notifications capture the request `ctx` (which is cancelled when the HTTP response is sent):

```go
go func() {
    var sellerEmail, storeName string
    err := a.DB.QueryRow(ctx, `SELECT ...`) // ctx may already be cancelled
    ...
}()
```

When the HTTP handler returns before the goroutine completes its DB query, the context is cancelled and the query fails silently. This means seller notification emails may never be sent.

**Impact:**
- Seller order notifications and subscriber notifications may be silently dropped.
- No direct security impact, but reliability of notification delivery is affected.

**Remediation:**
Use `context.Background()` (with a reasonable timeout) instead of the request context for fire-and-forget goroutines:
```go
go func() {
    bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    a.DB.QueryRow(bgCtx, ...)
}()
```

---

## Low Severity Findings

### L-1: Magic Link Token Does Not Bind to IP or User-Agent

**Severity:** Low
**Location:** `backend/internal/api/v1/buyer_auth.go:60-68`

**Description:**
Magic link tokens are stored in the database with only `email`, `token`, and `expires_at`. They are not bound to the requesting IP address or user-agent. If a magic link email is intercepted, it can be used from any device or network.

**Impact:**
- Intercepted magic links (e.g., from compromised email) can be used from any location.
- Mitigated by the 15-minute expiry and single-use design.

**Remediation:**
1. Optionally bind the token to the requester's IP/user-agent and verify on verification.
2. The current 15-minute TTL + single-use is a reasonable mitigation for MVP.

---

### L-2: No Account Lockout After Failed Login Attempts

**Severity:** Low
**Location:** `backend/internal/api/v1/auth.go:111-167`

**Description:**
The login endpoint returns "invalid credentials" on failure but does not track failed attempts per account. The rate limiter (5 req/min per IP) provides some protection, but an attacker using multiple IPs (botnet) could perform distributed password guessing.

**Impact:**
- Distributed brute-force attacks are not mitigated by the per-IP rate limiter alone.

**Remediation:**
1. Track failed login attempts per email/account in the database.
2. Implement progressive delays (exponential backoff) after 3+ failures.
3. Consider temporary account lockout after 10+ consecutive failures.

---

### L-3: Error Messages May Reveal Internal State

**Severity:** Low
**Location:** `backend/internal/resp/resp.go:41-43`

**Description:**
The `Internal` function logs the full error but returns a generic message:

```go
func Internal(w http.ResponseWriter, err error) {
    log.Printf("internal error: %v", err)
    JSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
}
```

This is good practice. However, some `BadRequest` responses include Google Places API error messages:

```go
// geo_google_places.go:118
msg := strings.TrimSpace(ge.Error.Message)
if msg == "" { msg = "google places request failed" }
resp.BadRequest(w, msg)
```

Google API error messages could leak information about the API key's configuration, quotas, or billing status.

**Impact:**
- Minor information disclosure about third-party API configuration.

**Remediation:**
Always return generic error messages for external API failures. Log the specific Google error server-side.

---

### L-4: Non-Prod CORS Allows Any *.vercel.app Subdomain

**Severity:** Low
**Location:** `backend/internal/httpx/cors.go:60`

**Description:**
In non-production environments, any `https://*.vercel.app` origin is allowed:

```go
if strings.HasSuffix(origin, ".vercel.app") && strings.HasPrefix(origin, "https://") {
    return true
}
```

This allows any Vercel-hosted application (by anyone) to make credentialed cross-origin requests to the non-prod backend.

**Impact:**
- An attacker could deploy a malicious app on Vercel and make authenticated API requests if they can trick users into visiting it.
- Only affects non-production environments.

**Remediation:**
1. Restrict to a specific Vercel project prefix (e.g., `local-roots-*.vercel.app`).
2. Or restrict to a Vercel team domain pattern.

---

## Informational Findings

### I-1: JWT Tokens Stored in localStorage

**Severity:** Info
**Location:** `frontend/src/lib/session.ts:23`

**Description:**
JWT tokens are stored in `window.localStorage` which is accessible to any JavaScript running on the same origin. If an XSS vulnerability exists in the frontend, the token can be exfiltrated. HttpOnly cookies are generally considered more secure for token storage.

**Note:** This is a common trade-off for SPAs. The risk is mitigated by React's built-in XSS protections and the use of a separate API domain.

---

### I-2: Version/Environment Disclosure in API Root

**Severity:** Info
**Location:** `backend/internal/httpx/handler.go:28`

**Description:**
The `GET /v1` endpoint returns the environment name:

```go
_, _ = w.Write([]byte(`{"name":"local-roots","env":"` + deps.Config.Env + `"}`))
```

This reveals whether the backend is running in `dev` or `prod` mode.

**Remediation:** Consider removing the `env` field from the response or restricting this endpoint to authenticated users.

---

### I-3: Bcrypt Default Cost Used

**Severity:** Info
**Location:** `backend/internal/auth/auth.go:20`

**Description:**
`bcrypt.DefaultCost` (currently 10) is used for password hashing. While acceptable, modern guidance recommends cost 12+ for production systems to keep pace with hardware improvements.

**Remediation:** Consider increasing to cost 12 and benchmarking to ensure login latency remains acceptable.

---

### I-4: No Request ID Generation

**Severity:** Info
**Location:** `backend/internal/httpx/logging.go:43-44`

**Description:**
The logging middleware reads `X-Railway-Request-Id` or `X-Request-Id` from incoming headers but does not generate one if absent. This makes it harder to trace requests in non-Railway environments.

**Remediation:** Generate a UUID request ID if none is present and include it in the response headers.

---

### I-5: Docker Compose Uses Static Credentials for Local Development

**Severity:** Info
**Location:** `docker-compose.yml:5-6`

**Description:**
The local development PostgreSQL uses static credentials (`localroots:localroots`). This is standard for local development and not a security concern, but these credentials should never be used in production.

**Note:** This is expected behavior for local development.

---

## Areas of Strong Security Practice

The following security measures are well-implemented and deserve recognition:

1. **Parameterized SQL Queries Throughout** -- All database queries use `$1`, `$2` positional parameters via `pgx`. No SQL injection vectors were found in any backend code. This is the single most important security measure for a database-backed application.

2. **Stripe Webhook Signature Verification** -- `backend/internal/api/v1/stripe_webhook.go:52-54` verifies the `Stripe-Signature` header against the configured webhook secret using the official Stripe SDK's `webhook.ConstructEvent`. Support for multiple secrets enables zero-downtime rotation.

3. **Payment Intent Amount Verification** -- `backend/internal/api/v1/orders.go:298-300` verifies that the Stripe PaymentIntent amount matches the server-calculated total before accepting an order. This prevents price tampering.

4. **Strict CORS in Production** -- `backend/internal/httpx/cors.go:55-57` requires explicit origin allowlisting in production mode. This prevents cross-origin attacks from unauthorized domains.

5. **Idempotency Keys for Stripe Operations** -- All Stripe capture, cancel, and authorization operations use idempotency keys (e.g., `"capture-"+orderID`), preventing double-charges from retries.

6. **Store Ownership Middleware** -- `backend/internal/api/v1/store_middleware.go` consistently verifies that the authenticated user owns the store before allowing any seller operation. This prevents IDOR attacks on seller endpoints.

7. **UUID Validation** -- `backend/internal/api/v1/orders.go:21-25` validates UUID format before passing to SQL queries, preventing type confusion.

8. **Request Body Size Limits** -- `backend/internal/resp/decode.go:15` limits JSON body size to 1 MiB, preventing request-based DoS.

9. **Webhook Body Size Limits** -- `backend/internal/api/v1/stripe_webhook.go:43` limits webhook body to 2 MiB.

10. **Non-Root Docker Container** -- The Dockerfile creates and runs as a non-root `app` user.

11. **Payment Status Transition Validation** -- `validPaymentTransition` prevents backward or invalid state changes from out-of-order webhooks.

12. **Google ID Token Verification** -- Proper JWKS-based verification with audience and issuer checks, plus key caching with TTL.

13. **Generic Error Messages** -- Internal errors return `"internal server error"` without leaking stack traces or SQL errors.

14. **Credential-Aware Login Responses** -- Login and registration return identical error formats for "user not found" and "wrong password" (both return "invalid credentials"), preventing user enumeration.

---

## Overall Security Posture Assessment

**Rating: B- (Good foundation, needs targeted hardening)**

### Strengths
The application demonstrates security-aware development practices. The use of parameterized queries everywhere eliminates the most common web application vulnerability class. Stripe integration follows best practices with webhook verification, idempotency keys, and server-side amount validation. The authentication architecture is sound with proper JWT validation, CORS enforcement, and ownership checks.

### Key Risk Areas
1. **The Stripe customer search injection (C-1) is the most actionable critical finding** -- it requires a straightforward fix (switch to list API or sanitize input).
2. **Secret file hygiene (C-2)** needs immediate attention -- delete the temp files and ensure gitignore coverage.
3. **The 30-day JWT lifetime (H-1)** is the highest architectural risk -- it makes every other vulnerability more impactful because compromised tokens have a very long window of usefulness.
4. **Missing rate limits (H-3)** on order creation and geo endpoints need to be addressed before scaling.

### Priority Remediation Order
1. **Immediate (this week):** C-1 (Stripe injection), C-2 (delete env files)
2. **High priority (next sprint):** H-1 (JWT TTL), H-3 (rate limiting), H-4 (token in URLs), H-5 (pickup code brute force)
3. **Medium priority (next 2 sprints):** H-2 (JWT secret validation), M-2 (password policy), M-3 (security headers), M-6 (upload auth)
4. **Low priority (backlog):** M-1 (CSRF), M-4 (timing attack), M-5 (role escalation), M-7 (goroutine context), all Low/Info findings

### Notes for Production Readiness
Before onboarding real farmers with real payments:
- Reduce JWT lifetime to hours, not days
- Add monitoring/alerting for failed auth attempts, unusual payment patterns, and rate limit hits
- Implement a token revocation mechanism
- Conduct a Supabase Storage policy audit
- Consider a penetration test by a third-party security firm

---

*End of Security Audit Report*
