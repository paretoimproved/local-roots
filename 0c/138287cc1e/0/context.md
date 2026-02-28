# Session Context

Session ID: 1b9e697f-70e3-49d8-a9cf-57fabedcc7c0
Commit Message: <teammate-message teammate_id="team-lead">
You are the Frontend DRY agen

## Prompts

### Prompt 1

<teammate-message teammate_id="team-lead">
You are the Frontend DRY agent. Implement items #33 and #35 from the P3 audit.

Project root: "/Users/brandonqueener/Cursor Projects/Local-Roots"

## YOUR EXCLUSIVE FILES
- `frontend/src/components/checkout-form.tsx`
- `frontend/src/components/subscribe-form.tsx`
- `frontend/src/lib/ui.ts`
- For cadenceLabel replacements: `stores/[storeId]/boxes/page.tsx`, `boxes/[planId]/page.tsx`, `stores/[storeId]/page.tsx`, `seller/stores/[storeId]/setup/review/page.tsx`, `buyer/page.tsx`, `boxes/[planId]/qr/page.tsx`

DO NOT TOUCH: `seller/stores/[storeId]/page.tsx` (owned by Agent 3 — the seller store page decomposition agent), `layout.tsx`, `globals.css`, backend files

## Item #33 — Add `<form>` Elements to Checkout Forms

### 1. Read `frontend/src/components/checkout-form.tsx`
Find the submit button and the wrapping div. Wrap the form contents in a `<form onSubmit={handleSubmit}>` element (where `handleSubmit` calls `e.preventDefault()` then the existing submit logic). Change the submit button to `type="submit"`.

### 2. Read `frontend/src/components/subscribe-form.tsx`
Same treatment — wrap in `<form onSubmit>`, change button to `type="submit"`.

Important: Make sure `e.preventDefault()` is called in the onSubmit handler so the form doesn't do a browser submission. Keep all existing functionality intact.

## Item #35 — Extract cadenceLabel() to lib/ui.ts

### 1. Read `frontend/src/lib/ui.ts`
Understand the existing exports.

### 2. Find one of the duplicated `cadenceLabel` functions
Read any of the 7 files that define it (e.g., `boxes/[planId]/page.tsx`). Copy the function.

### 3. Add `cadenceLabel` to `lib/ui.ts`
Export it as a named function. It should take a cadence string (like "weekly", "biweekly", "monthly") and return a human-readable label.

### 4. Replace all 7 duplicates
In each of these files, delete the local `cadenceLabel` function and import from `@/lib/ui`:
- `frontend/src/app/stores/[storeId]/boxes/page.tsx`
- `frontend/src/app/boxes/[planId]/page.tsx`
- `frontend/src/app/stores/[storeId]/page.tsx` — SKIP this one (owned by decomposition agent)
- `frontend/src/components/subscribe-form.tsx`
- `frontend/src/app/seller/stores/[storeId]/setup/review/page.tsx`
- `frontend/src/app/buyer/page.tsx`
- `frontend/src/app/boxes/[planId]/qr/page.tsx`

For `stores/[storeId]/page.tsx` (buyer store detail): this is a server component that fetches data. Make sure the import works there.

IMPORTANT: Do NOT modify `frontend/src/app/seller/stores/[storeId]/page.tsx` — that's owned by the decomposition agent.

## Verification
After changes: `cd "/Users/brandonqueener/Cursor Projects/Local-Roots" && pnpm typecheck && pnpm lint`

When done, mark task #2 as completed using TaskUpdate.
</teammate-message>

## Summary

You've hit your limit · resets 10am (America/Los_Angeles)
