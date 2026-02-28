package v1

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SellerAnalyticsAPI struct {
	DB *pgxpool.Pool
}

type RevenueByCycle struct {
	CycleDate   string `json:"cycle_date"`
	RevenueCents int   `json:"revenue_cents"`
	Orders       int   `json:"orders"`
	Pickups      int   `json:"pickups"`
}

type AnalyticsResponse struct {
	ActiveSubscribers int `json:"active_subscribers"`
	TotalSubscribers  int `json:"total_subscribers"`
	ChurnCount        int `json:"churn_count"`
	TotalRevenueCents int `json:"total_revenue_cents"`
	TotalOrders       int `json:"total_orders"`
	PickedUpCount     int `json:"picked_up_count"`
	PickupRate        float64          `json:"pickup_rate"`
	RevenueByCycle    []RevenueByCycle `json:"revenue_by_cycle"`
}

func (a SellerAnalyticsAPI) GetAnalytics(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	ctx := r.Context()
	var out AnalyticsResponse

	// Subscription metrics: join subscription_plans → subscriptions.
	if err := a.DB.QueryRow(ctx, `
		select
			coalesce(count(*) filter (where s.status = 'active'), 0)::int,
			coalesce(count(*), 0)::int,
			coalesce(count(*) filter (where s.status = 'canceled'), 0)::int
		from subscriptions s
		join subscription_plans sp on sp.id = s.plan_id
		where sp.store_id = $1::uuid
	`, sc.StoreID).Scan(
		&out.ActiveSubscribers,
		&out.TotalSubscribers,
		&out.ChurnCount,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	// Order-level metrics.
	if err := a.DB.QueryRow(ctx, `
		select
			coalesce(sum(subtotal_cents) filter (where status = 'picked_up'), 0)::int,
			coalesce(count(*) filter (where status not in ('canceled')), 0)::int,
			coalesce(count(*) filter (where status = 'picked_up'), 0)::int
		from orders
		where store_id = $1::uuid
	`, sc.StoreID).Scan(
		&out.TotalRevenueCents,
		&out.TotalOrders,
		&out.PickedUpCount,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	if out.TotalOrders > 0 {
		out.PickupRate = float64(out.PickedUpCount) / float64(out.TotalOrders)
	}

	// Revenue grouped by pickup window date (last 12 cycles).
	rows, err := a.DB.Query(ctx, `
		select
			pw.start_at::date::text as cycle_date,
			coalesce(sum(o.subtotal_cents) filter (where o.status = 'picked_up'), 0)::int as revenue_cents,
			count(o.id)::int as orders,
			coalesce(count(o.id) filter (where o.status = 'picked_up'), 0)::int as pickups
		from pickup_windows pw
		join orders o on o.pickup_window_id = pw.id
		where pw.store_id = $1::uuid
			and o.status not in ('canceled')
		group by pw.start_at::date
		order by pw.start_at::date desc
		limit 12
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out.RevenueByCycle = make([]RevenueByCycle, 0)
	for rows.Next() {
		var c RevenueByCycle
		if err := rows.Scan(&c.CycleDate, &c.RevenueCents, &c.Orders, &c.Pickups); err != nil {
			resp.Internal(w, err)
			return
		}
		out.RevenueByCycle = append(out.RevenueByCycle, c)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	// Reverse so oldest first (chronological order for charts).
	for i, j := 0, len(out.RevenueByCycle)-1; i < j; i, j = i+1, j-1 {
		out.RevenueByCycle[i], out.RevenueByCycle[j] = out.RevenueByCycle[j], out.RevenueByCycle[i]
	}

	resp.OK(w, out)
}

// PayoutHistoryEntry represents a single order's payout info.
type PayoutHistoryEntry struct {
	OrderID          string    `json:"order_id"`
	PickupDate       time.Time `json:"pickup_date"`
	TotalCents       int       `json:"total_cents"`
	SellerPayoutCents int      `json:"seller_payout_cents"`
	PlatformFeeCents int       `json:"platform_fee_cents"`
	Status           string    `json:"status"`
	TransferID       *string   `json:"transfer_id"`
}

// GetPayoutHistory lists individual order payouts for a store (orders that reached picked_up or no_show with captured funds).
func (a SellerAnalyticsAPI) GetPayoutHistory(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	ctx := r.Context()

	rows, err := a.DB.Query(ctx, `
		select
			o.id::text,
			coalesce(o.picked_up_at, o.updated_at) as payout_date,
			o.total_cents,
			o.subtotal_cents as seller_payout_cents,
			o.buyer_fee_cents as platform_fee_cents,
			o.status,
			o.stripe_transfer_id
		from orders o
		where o.store_id = $1::uuid
			and o.status in ('picked_up', 'no_show')
			and o.captured_cents > 0
		order by coalesce(o.picked_up_at, o.updated_at) desc
		limit 50
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]PayoutHistoryEntry, 0)
	for rows.Next() {
		var e PayoutHistoryEntry
		if err := rows.Scan(
			&e.OrderID,
			&e.PickupDate,
			&e.TotalCents,
			&e.SellerPayoutCents,
			&e.PlatformFeeCents,
			&e.Status,
			&e.TransferID,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, e)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}
