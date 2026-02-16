package v1

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SellerPayoutsAPI struct {
	DB                     *pgxpool.Pool
	NoShowPlatformSplitBps int
}

type PickupWindowPayoutSummary struct {
	StoreID        string `json:"store_id"`
	PickupWindowID string `json:"pickup_window_id"`

	SellerPayoutCents  int `json:"seller_payout_cents"`
	PlatformFeeCents   int `json:"platform_fee_cents"`
	GrossCapturedCents int `json:"gross_captured_cents"`

	PickedUpCount int `json:"picked_up_count"`
	NoShowCount   int `json:"no_show_count"`
	CanceledCount int `json:"canceled_count"`
	OpenCount     int `json:"open_count"`

	PayoutPickedUpCents int `json:"payout_picked_up_cents"`
	PayoutNoShowCents   int `json:"payout_no_show_cents"`

	TransferredCount int `json:"transferred_count"`
}

func (a SellerPayoutsAPI) GetPickupWindowPayoutSummary(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var out PickupWindowPayoutSummary
	out.StoreID = sc.StoreID
	out.PickupWindowID = windowID

	var grossNoShowCaptured int
	if err := a.DB.QueryRow(r.Context(), `
		select
			coalesce(count(*) filter (where status = 'picked_up'), 0)::int,
			coalesce(count(*) filter (where status = 'no_show'), 0)::int,
			coalesce(count(*) filter (where status = 'canceled'), 0)::int,
			coalesce(count(*) filter (where status in ('placed','ready')), 0)::int,

			coalesce(sum(subtotal_cents) filter (where status = 'picked_up'), 0)::int,
			coalesce(sum(captured_cents) filter (where status = 'no_show'), 0)::int,
			coalesce(sum(buyer_fee_cents) filter (where status = 'picked_up'), 0)::int,
			coalesce(sum(captured_cents) filter (where status in ('picked_up','no_show')), 0)::int,

			coalesce(count(*) filter (where stripe_transfer_id is not null), 0)::int
		from orders
		where store_id = $1::uuid
			and pickup_window_id = $2::uuid
	`, sc.StoreID, windowID).Scan(
		&out.PickedUpCount,
		&out.NoShowCount,
		&out.CanceledCount,
		&out.OpenCount,

		&out.PayoutPickedUpCents,
		&grossNoShowCaptured,
		&out.PlatformFeeCents,
		&out.GrossCapturedCents,

		&out.TransferredCount,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	// No-show captured amount is split between platform and seller.
	// Seller gets (10000 - splitBps)/10000 of the captured amount.
	splitBps := a.NoShowPlatformSplitBps
	if splitBps <= 0 {
		splitBps = 3000 // 30% platform default
	}
	platformNoShow := (grossNoShowCaptured * splitBps) / 10000
	out.PayoutNoShowCents = grossNoShowCaptured - platformNoShow
	out.PlatformFeeCents += platformNoShow

	out.SellerPayoutCents = out.PayoutPickedUpCents + out.PayoutNoShowCents

	resp.OK(w, out)
}
