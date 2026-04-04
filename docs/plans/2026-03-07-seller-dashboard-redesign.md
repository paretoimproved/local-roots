# Seller Dashboard Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the seller store page into Pickups/Manage tabs with a global pickup code entry, so farmers can confirm pickups in 2 taps instead of 7.

**Architecture:** Add a new backend endpoint (`POST /v1/seller/stores/{storeId}/orders/lookup-by-code`) that finds an order by its 6-digit pickup code within a store. On the frontend, restructure the seller store page into two tabs — Pickups (default, farmstand operations) and Manage (admin tasks). The global code entry on the Pickups tab calls the lookup endpoint, shows a preview, then confirms via the existing confirm-pickup endpoint.

**Tech Stack:** Go (backend API), Next.js App Router (frontend), PostgreSQL, Tailwind CSS with LocalRoots design system (`lr-card`, `lr-btn`, `lr-chip`, CSS variables).

---

## Task 1: Backend — LookupByCode endpoint + tests

**Files:**
- Modify: `backend/internal/api/v1/seller_orders.go` (add handler after ConfirmPickup ~line 461)
- Modify: `backend/internal/api/v1/seller_orders_test.go` (add tests)
- Modify: `backend/internal/httpx/handler.go` (register route ~line 127)

**Step 1: Write the failing test**

Add to `backend/internal/api/v1/seller_orders_test.go`:

```go
func TestLookupByCode_Validation(t *testing.T) {
	api := SellerOrdersAPI{}

	cases := []struct {
		name   string
		body   string
		status int
	}{
		{"empty body", `{}`, http.StatusBadRequest},
		{"missing pickup_code", `{"pickup_code":""}`, http.StatusBadRequest},
		{"non-digit code", `{"pickup_code":"abcdef"}`, http.StatusBadRequest},
		{"too short", `{"pickup_code":"123"}`, http.StatusBadRequest},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/v1/seller/stores/fake/orders/lookup-by-code", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()
			api.LookupByCode(rr, req, AuthUser{ID: "user-1", Role: "seller"}, StoreContext{StoreID: "00000000-0000-0000-0000-000000000001"})
			if rr.Code != tc.status {
				t.Errorf("got %d want %d: %s", rr.Code, tc.status, rr.Body.String())
			}
		})
	}
}
```

This test will need these imports added to the test file: `"net/http"`, `"net/http/httptest"`, `"strings"`.

**Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/api/v1/ -run TestLookupByCode_Validation -v`
Expected: FAIL — `api.LookupByCode` does not exist yet.

**Step 3: Write the LookupByCode handler**

Add to `backend/internal/api/v1/seller_orders.go` after the `ConfirmPickup` function (after line ~461):

```go
type LookupByCodeRequest struct {
	PickupCode string `json:"pickup_code"`
}

// LookupByCode finds a placed/ready order by its 6-digit pickup code within the seller's store.
func (a SellerOrdersAPI) LookupByCode(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in LookupByCodeRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.PickupCode = strings.TrimSpace(in.PickupCode)
	if in.PickupCode == "" || len(in.PickupCode) != 6 {
		resp.BadRequest(w, "pickup_code must be 6 digits")
		return
	}
	for _, c := range in.PickupCode {
		if c < '0' || c > '9' {
			resp.BadRequest(w, "pickup_code must be 6 digits")
			return
		}
	}

	ctx := r.Context()

	var order SellerOrderRow
	err := a.DB.QueryRow(ctx, `
		select
			o.id::text,
			o.store_id::text,
			o.pickup_window_id::text,
			o.buyer_email,
			o.buyer_name,
			o.buyer_phone,
			o.status,
			o.payment_method,
			o.payment_status,
			o.subtotal_cents,
			o.buyer_fee_cents,
			o.total_cents,
			coalesce(o.captured_cents, 0),
			o.created_at
		from orders o
		where o.store_id = $1::uuid
			and o.pickup_code = $2
			and o.status in ('placed', 'ready')
		order by o.created_at desc
		limit 1
	`, sc.StoreID, in.PickupCode).Scan(
		&order.ID,
		&order.StoreID,
		&order.PickupWindowID,
		&order.BuyerEmail,
		&order.BuyerName,
		&order.BuyerPhone,
		&order.Status,
		&order.PaymentMethod,
		&order.PaymentStatus,
		&order.SubtotalCents,
		&order.BuyerFeeCents,
		&order.TotalCents,
		&order.CapturedCents,
		&order.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "no matching order found for this code")
			return
		}
		resp.Internal(w, err)
		return
	}

	// Fetch items.
	items, err := fetchOrderItems(ctx, a.DB, order.ID)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, SellerOrderResponse{
		ID:              order.ID,
		StoreID:         order.StoreID,
		PickupWindowID:  order.PickupWindowID,
		BuyerEmail:      order.BuyerEmail,
		BuyerName:       order.BuyerName,
		BuyerPhone:      order.BuyerPhone,
		Status:          order.Status,
		PaymentMethod:   order.PaymentMethod,
		PaymentStatus:   order.PaymentStatus,
		SubtotalCents:   order.SubtotalCents,
		BuyerFeeCents:   order.BuyerFeeCents,
		TotalCents:      order.TotalCents,
		CapturedCents:   order.CapturedCents,
		CreatedAt:       order.CreatedAt,
		Items:           items,
	})
}
```

Note: Check if `SellerOrderRow` and `SellerOrderResponse` types already exist in `seller_orders.go`. If the existing `ListOrdersForPickupWindow` uses inline struct scanning, extract the shared types. If it already uses named types, reuse them. Also check if `fetchOrderItems` exists — if not, extract the item-fetching logic from `ListOrdersForPickupWindow` into a shared helper.

**Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/api/v1/ -run TestLookupByCode_Validation -v`
Expected: PASS — all 4 validation cases return 400.

**Step 5: Register the route**

In `backend/internal/httpx/handler.go`, after line 127 (the `confirm-pickup` route), add:

```go
mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/lookup-by-code", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerOrders.LookupByCode)))
```

**Step 6: Run all backend tests**

Run: `cd backend && go test ./...`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add backend/internal/api/v1/seller_orders.go backend/internal/api/v1/seller_orders_test.go backend/internal/httpx/handler.go
git commit -m "feat: add lookup-by-code endpoint for global pickup code entry"
```

---

## Task 2: Frontend — Add lookupByCode to seller API client

**Files:**
- Modify: `frontend/src/lib/seller-api.ts` (~line 461, after `confirmPickup`)

**Step 1: Add the API method**

After the `confirmPickup` method in `seller-api.ts`, add:

```typescript
  lookupByCode: (token: string, storeId: string, pickupCode: string) =>
    requestJSON<SellerOrder>(
      `/v1/seller/stores/${storeId}/orders/lookup-by-code`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ pickup_code: pickupCode }),
      },
    ),
```

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Pass.

**Step 3: Commit**

```bash
git add frontend/src/lib/seller-api.ts
git commit -m "feat: add lookupByCode method to seller API client"
```

---

## Task 3: Frontend — Create GlobalPickupEntry component

**Files:**
- Create: `frontend/src/components/seller/global-pickup-entry.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useRef, useState } from "react";
import { sellerApi, type SellerOrder } from "@/lib/seller-api";
import { formatMoney, friendlyErrorMessage } from "@/lib/ui";
import { StatusPill } from "@/components/seller/status-pills";

interface GlobalPickupEntryProps {
  token: string;
  storeId: string;
  onPickupConfirmed: () => void;
  showToast: (toast: { kind: "success" | "error"; message: string }) => void;
}

export function GlobalPickupEntry({
  token,
  storeId,
  onPickupConfirmed,
  showToast,
}: GlobalPickupEntryProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<SellerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLookup() {
    const trimmed = code.trim();
    if (trimmed.length !== 6 || !/^[0-9]{6}$/.test(trimmed)) {
      setError("Enter a 6-digit pickup code.");
      return;
    }
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const order = await sellerApi.lookupByCode(token, storeId, trimmed);
      setPreview(order);
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await sellerApi.confirmPickup(token, storeId, preview.id, code.trim());
      showToast({ kind: "success", message: "Pickup confirmed!" });
      setPreview(null);
      setCode("");
      inputRef.current?.focus();
      onPickupConfirmed();
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (preview) {
        handleConfirm();
      } else {
        handleLookup();
      }
    }
  }

  return (
    <section className="lr-card lr-card-strong p-5">
      <div className="text-sm font-semibold uppercase tracking-wide text-[color:var(--lr-muted)]">
        Confirm pickup
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          ref={inputRef}
          className="lr-field w-44 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] tabular-nums"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (preview) setPreview(null);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={busy}
          autoComplete="off"
        />
        {preview ? (
          <button
            type="button"
            className="lr-btn lr-btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Confirming\u2026" : "Confirm pickup"}
          </button>
        ) : (
          <button
            type="button"
            className="lr-btn lr-btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-50"
            onClick={handleLookup}
            disabled={busy || code.trim().length !== 6}
          >
            {busy ? "Looking up\u2026" : "Look up"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-[color:var(--lr-muted)]">
        Enter the buyer&apos;s 6-digit code, or scan their QR with your phone camera.
      </p>

      {error ? (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[color:var(--lr-leaf)]/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {preview.buyer_name ?? preview.buyer_email.split("@")[0]}
              </span>
              <span className="font-semibold text-[color:var(--lr-ink)]">
                {formatMoney(preview.total_cents)}
              </span>
              <StatusPill status={preview.status} />
            </div>
            <div className="mt-1 truncate text-sm text-[color:var(--lr-muted)]">
              {preview.items.map((it) => `${it.quantity}x ${it.product_title}`).join(", ")}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Pass.

**Step 3: Commit**

```bash
git add frontend/src/components/seller/global-pickup-entry.tsx
git commit -m "feat: add GlobalPickupEntry component for dashboard code entry"
```

---

## Task 4: Frontend — Redesign OrderList with grouped sections

**Files:**
- Modify: `frontend/src/components/seller/order-list.tsx` (full rewrite)

**Step 1: Rewrite OrderList with grouped sections**

Replace the entire component. Key changes:
- Remove: `orderFilter` state, filter buttons, `ManualPickupEntry` per-order
- Add: Group orders into "Ready", "Waiting" (placed), "Completed" (picked_up/canceled/no_show)
- Completed section collapsed by default with toggle
- Keep: expand/collapse per-order for details, secondary actions in expanded view

The new component should:
1. Remove the `pickupCodeByOrderId` and `onPickupCodeChange` props entirely
2. Remove the `onConfirmPickup` prop (global entry handles this now)
3. Remove the `payoutSummary` prop (earnings line is in the parent)
4. Keep: `orders`, `selectedWindowId`, `busyOrderId`, `onSetOrderStatus`
5. Group using `useMemo` to split orders into `ready`, `waiting`, `completed` arrays
6. Render each group with a heading showing count
7. Completed section has `showCompleted` toggle state

New prop interface:
```typescript
interface OrderListProps {
  orders: SellerOrder[] | null;
  selectedWindowId: string;
  busyOrderId: string | null;
  onSetOrderStatus: (
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) => void;
}
```

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Will initially fail because the parent page still passes removed props. That's expected — Task 6 fixes the parent.

**Step 3: Commit (if typecheck passes, otherwise defer to Task 6)**

---

## Task 5: Frontend — Simplify PickupWindowList for auto-select

**Files:**
- Modify: `frontend/src/components/seller/pickup-window-list.tsx`

**Step 1: Simplify the display**

Key changes:
- Default display: human-readable label like "Today - Farm Rd - 10am-12pm" or "Sat Mar 15 - Farm Rd - 10am-12pm"
- Small "Change" button that reveals the full `<select>` dropdown (hidden by default)
- Remove the "Buyer view" link (move to Manage tab)
- Keep sticky positioning

The component should still accept the same props but render differently:
- When a window is selected, show the friendly label prominently
- A small "Change" text button toggles `showSelector` state to reveal the dropdown
- The verbose `formatWindowLabel` is only used inside the dropdown, not as the main display

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Pass (prop interface unchanged).

**Step 3: Commit**

```bash
git add frontend/src/components/seller/pickup-window-list.tsx
git commit -m "refactor: simplify pickup window display with auto-select UX"
```

---

## Task 6: Frontend — Restructure seller store page with tabs

**Files:**
- Modify: `frontend/src/app/seller/stores/[storeId]/page.tsx` (major restructure)

**Step 1: Restructure the page**

Key changes:

1. **Add tab state**: `const [tab, setTab] = useState<"pickups" | "manage">("pickups");`

2. **Delete support popover**: Remove `supportOpen`, `supportBtnRef`, `supportPanelRef`, `supportPos` state variables. Remove the `useLayoutEffect` for positioning (~lines 86-110). Remove the `useEffect` for click-outside (~lines 112-130). Remove the support popover JSX (~lines 402-438). Rename "Support" button to "Help" — just link to `/seller/help` or remove entirely for now.

3. **Delete per-order code state**: Remove `pickupCodeByOrderId`, `setPickupCodeByOrderId`, `handlePickupCodeChange`, `confirmPickup` function. The `GlobalPickupEntry` component handles this internally.

4. **Add tab bar** below header:
```tsx
<div className="flex gap-1 rounded-xl bg-[color:var(--lr-border)]/50 p-1">
  <button
    type="button"
    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
      tab === "pickups"
        ? "bg-white text-[color:var(--lr-ink)] shadow-sm"
        : "text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
    }`}
    onClick={() => setTab("pickups")}
  >
    Pickups
  </button>
  <button
    type="button"
    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
      tab === "manage"
        ? "bg-white text-[color:var(--lr-ink)] shadow-sm"
        : "text-[color:var(--lr-muted)] hover:text-[color:var(--lr-ink)]"
    }`}
    onClick={() => setTab("manage")}
  >
    Manage
  </button>
</div>
```

5. **Pickups tab content**:
```tsx
{tab === "pickups" && (
  <div className="grid gap-6">
    <PickupWindowList ... />
    <GlobalPickupEntry
      token={token}
      storeId={storeId}
      onPickupConfirmed={() => {
        if (token && selectedWindowId) {
          sellerApi.listOrders(token, storeId, selectedWindowId).then(setOrders);
        }
      }}
      showToast={showToast}
    />
    {payoutSummary && payoutSummary.picked_up_count > 0 ? (
      <p className="text-sm text-[color:var(--lr-muted)]">
        Today: <span className="font-semibold text-[color:var(--lr-ink)]">{formatMoney(payoutSummary.seller_payout_cents)}</span>
        {" from "}{payoutSummary.picked_up_count} pickup{payoutSummary.picked_up_count !== 1 ? "s" : ""}
      </p>
    ) : null}
    <OrderList
      orders={orders}
      selectedWindowId={selectedWindowId}
      busyOrderId={busyOrderId}
      onSetOrderStatus={setOrderStatus}
    />
  </div>
)}
```

6. **Manage tab content**:
```tsx
{tab === "manage" && (
  <div className="grid gap-8">
    <SubscriptionPlanList ... />
    <SubscriberList ... />
    {payoutSummary ? <PayoutSummaryCard summary={payoutSummary} /> : null}
  </div>
)}
```

7. **Import changes**: Add `GlobalPickupEntry` import. Add `formatMoney` import from `@/lib/ui`. Remove `ManualPickupEntry` import if present. Import `PayoutSummaryCard` directly (it was previously imported inside OrderList).

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Pass. All prop changes from Task 4 should now align.

**Step 3: Commit**

```bash
git add frontend/src/app/seller/stores/[storeId]/page.tsx frontend/src/components/seller/order-list.tsx
git commit -m "feat: split seller dashboard into Pickups/Manage tabs with global code entry"
```

---

## Task 7: Frontend — Move Store ID to Settings page

**Files:**
- Modify: `frontend/src/app/seller/stores/[storeId]/settings/page.tsx`

**Step 1: Add Store ID section**

Find the settings page content area. Add a "Support" section at the bottom with the Store ID display and copy button. Pattern:

```tsx
<section className="lr-card p-6">
  <h2 className="text-base font-semibold">Support</h2>
  <p className="mt-1 text-sm text-[color:var(--lr-muted)]">
    Only needed if you contact support.
  </p>
  <div className="mt-3 flex items-center gap-2">
    <span className="lr-chip rounded-xl px-3 py-2 font-mono text-xs text-[color:var(--lr-ink)]">
      {storeId}
    </span>
    <button
      type="button"
      className="lr-btn lr-chip px-3 py-2 text-xs font-semibold text-[color:var(--lr-ink)]"
      onClick={() => {
        navigator.clipboard
          .writeText(storeId)
          .then(() => showToast({ kind: "success", message: "Store ID copied." }))
          .catch(() => showToast({ kind: "error", message: "Could not copy." }));
      }}
    >
      Copy Store ID
    </button>
  </div>
</section>
```

Add this at the end of the settings page, before the closing `</div>`.

**Step 2: Run frontend checks**

Run: `pnpm typecheck && pnpm lint`
Expected: Pass.

**Step 3: Commit**

```bash
git add frontend/src/app/seller/stores/[storeId]/settings/page.tsx
git commit -m "refactor: move Store ID to settings page, remove support popover"
```

---

## Task 8: Cleanup — Remove dead code

**Files:**
- Check: `frontend/src/components/seller/manual-pickup-entry.tsx` — verify no other imports
- Check: `frontend/src/components/seller/payout-summary.tsx` — verify still imported by Manage tab

**Step 1: Check for remaining imports of ManualPickupEntry**

Run: `grep -r "ManualPickupEntry\|manual-pickup-entry" frontend/src/ --include="*.tsx" --include="*.ts"`

If the only import is from `order-list.tsx` and we removed it in Task 4, the component is dead code.

**Step 2: If dead, delete the file**

```bash
rm frontend/src/components/seller/manual-pickup-entry.tsx
```

**Step 3: Verify PayoutSummaryCard is still used**

Run: `grep -r "PayoutSummaryCard\|payout-summary" frontend/src/ --include="*.tsx" --include="*.ts"`

It should be imported by the seller store page (Manage tab). If so, keep it.

**Step 4: Run full verification**

Run: `pnpm typecheck && pnpm lint`
Run: `cd backend && go test ./...`
Expected: All pass.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead ManualPickupEntry component and unused code"
```

---

## Task 9: Final verification + visual check

**Step 1: Run all checks**

```bash
pnpm typecheck && pnpm lint
cd backend && go test ./...
```

**Step 2: Visual verification checklist**

Start both servers (`pnpm dev` + `pnpm dev:backend`) and verify:

- [ ] `/seller/stores/{id}` loads with "Pickups" tab active by default
- [ ] Pickup window auto-selects current/next window
- [ ] Global code entry is prominent at top
- [ ] Orders show grouped: Ready, Waiting, Completed (collapsed)
- [ ] Clicking "Manage" tab shows plans, subscribers, payout summary
- [ ] Support popover is gone from the page
- [ ] Settings page shows Store ID with Copy button
- [ ] No console errors

**Step 3: Final commit if any fixes needed**

---

## Summary of deleted code (tech debt)

| What | Lines removed (approx) | Why |
|------|----------------------|-----|
| Support popover (positioning + click-outside) | ~50 lines | Store ID moved to Settings |
| `pickupCodeByOrderId` state + handlers | ~30 lines | Replaced by GlobalPickupEntry |
| `ManualPickupEntry` per-order rendering | ~20 lines per order card | Global entry replaces it |
| Order filter buttons (6-button bar) | ~30 lines | Replaced by grouped sections |
| `ManualPickupEntry` component file | ~48 lines | Dead code |
| `PayoutSummaryCard` in OrderList | Moved | Now in Manage tab directly |
| **Total** | **~200 lines deleted** | |
