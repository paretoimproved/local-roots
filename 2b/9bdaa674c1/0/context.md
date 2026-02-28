# Session Context

Session ID: b600d7bc-f3c6-4ce3-b612-89ad1ce122c2
Commit Message: <teammate-message teammate_id="security-agent" color="purple">
{"type":"

## Prompts

### Prompt 1

<teammate-message teammate_id="team-lead">
You are the Backend Security agent. Implement items #26 and #27 from the P2 audit. These are two quick fixes.

Project root: "/Users/brandonqueener/Cursor Projects/Local-Roots"
Backend: Go + PostgreSQL.

## YOUR EXCLUSIVE FILES
- `backend/cmd/api/main.go` (only the JWT_SECRET length check — do NOT modify the existing empty-string check)
- `backend/internal/api/v1/internal_billing.go`
- `backend/internal/api/v1/internal_email.go`

DO NOT TOUCH any other files.

## Item #26 — Validate JWT_SECRET Minimum Length

### 1. Read `backend/cmd/api/main.go`
There's already a check that rejects empty JWT_SECRET in prod (added in P1). Enhance it to also reject secrets shorter than 32 characters:
```go
if cfg.Env == "prod" && len(cfg.JWTSecret) < 32 {
    log.Fatal("JWT_SECRET must be at least 32 characters in production")
}
```
This should REPLACE the existing empty-string check (since len < 32 covers empty). Don't add a second check — modify the existing one.

## Item #27 — Constant-Time Comparison for Cron Secret

### 1. Read `backend/internal/api/v1/internal_billing.go`
Find the `requireSecret` function or wherever the cron secret is compared. Replace the `!=` string comparison with `crypto/subtle.ConstantTimeCompare`:
```go
import "crypto/subtle"

// Replace:  if secret != expected { ... }
// With:
if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
    // unauthorized
}
```
Make sure to add the `"crypto/subtle"` import.

### 2. Read `backend/internal/api/v1/internal_email.go`
Same fix — find the secret comparison and replace with constant-time comparison.

## Verification
After changes, run: `cd "/Users/brandonqueener/Cursor Projects/Local-Roots/backend" && go build ./... && go test ./...`

When done, mark task #4 as completed using TaskUpdate.
</teammate-message>

### Prompt 2

<teammate-message teammate_id="security-agent" color="purple">
{"type":"task_assignment","taskId":"4","subject":"Backend Security (#26, #27)","description":"Validate JWT_SECRET minimum 32 chars at startup, use constant-time comparison for cron secret. Owns: main.go, internal_billing.go, internal_email.go.","assignedBy":"security-agent","timestamp":"2026-02-28T17:00:56.546Z"}
</teammate-message>

## Summary

No available unblocked tasks for me to pick up — task #3 and #6 are pending but #6 is blocked, and #3 isn't assigned to me. Standing by for further instructions from the team lead.
