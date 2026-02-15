package v1

import (
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SellerPayoutsAPI struct {
	DB *pgxpool.Pool
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
}

func (a SellerPayoutsAPI) GetPickupWindowPayoutSummary(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	windowID := r.PathValue("pickupWindowId")
	if storeID == "" || windowID == "" {
		resp.BadRequest(w, "missing storeId or pickupWindowId")
		return
	}

	var ownerID string
	if err := a.DB.QueryRow(r.Context(), `select owner_user_id::text from stores where id = $1::uuid`, storeID).Scan(&ownerID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "store not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerID != u.ID {
		resp.Forbidden(w, "not your store")
		return
	}

	var out PickupWindowPayoutSummary
	out.StoreID = storeID
	out.PickupWindowID = windowID

	// NOTE: For MVP, seller payout is the pre-fee subtotal on successful pickups, plus any captured no-show penalty.
	// Platform fee is tracked as buyer_fee_cents for picked-up orders (since those captures include the fee).
	if err := a.DB.QueryRow(r.Context(), `
		select
			coalesce(count(*) filter (where status = 'picked_up'), 0)::int,
			coalesce(count(*) filter (where status = 'no_show'), 0)::int,
			coalesce(count(*) filter (where status = 'canceled'), 0)::int,
			coalesce(count(*) filter (where status in ('placed','ready')), 0)::int,

			coalesce(sum(subtotal_cents) filter (where status = 'picked_up'), 0)::int,
			coalesce(sum(captured_cents) filter (where status = 'no_show'), 0)::int,
			coalesce(sum(buyer_fee_cents) filter (where status = 'picked_up'), 0)::int,
			coalesce(sum(captured_cents) filter (where status in ('picked_up','no_show')), 0)::int
		from orders
		where store_id = $1::uuid
			and pickup_window_id = $2::uuid
	`, storeID, windowID).Scan(
		&out.PickedUpCount,
		&out.NoShowCount,
		&out.CanceledCount,
		&out.OpenCount,

		&out.PayoutPickedUpCents,
		&out.PayoutNoShowCents,
		&out.PlatformFeeCents,
		&out.GrossCapturedCents,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	out.SellerPayoutCents = out.PayoutPickedUpCents + out.PayoutNoShowCents

	resp.OK(w, out)
}

