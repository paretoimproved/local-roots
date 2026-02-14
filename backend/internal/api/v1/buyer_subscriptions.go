package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type BuyerSubscriptionsAPI struct {
	DB     *pgxpool.Pool
	Stripe *stripepay.Client
}

type BuyerSubscription struct {
	ID        string    `json:"id"`
	PlanID    string    `json:"plan_id"`
	StoreID   string    `json:"store_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	Plan      struct {
		Title          string    `json:"title"`
		Cadence        string    `json:"cadence"`
		PriceCents     int       `json:"price_cents"`
		NextStartAt    time.Time `json:"next_start_at"`
		PickupLocation struct {
			Timezone string  `json:"timezone"`
			Label    *string `json:"label"`
			Address1 string  `json:"address1"`
			City     string  `json:"city"`
			Region   string  `json:"region"`
			Postal   string  `json:"postal_code"`
		} `json:"pickup_location"`
	} `json:"plan"`
}

type GetBuyerSubscriptionResponse struct {
	Subscription BuyerSubscription `json:"subscription"`
}

func (a BuyerSubscriptionsAPI) GetSubscription(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	subID := r.PathValue("subscriptionId")
	if subID == "" {
		resp.BadRequest(w, "missing subscriptionId")
		return
	}

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}

	var out BuyerSubscription
	var tz string
	var firstStartAt time.Time
	var cutoffHours int
	err := a.DB.QueryRow(r.Context(), `
		select
			s.id::text,
			s.plan_id::text,
			s.store_id::text,
			s.status,
			s.created_at,

			sp.title,
			sp.cadence,
			sp.price_cents,
			sp.first_start_at,
			sp.cutoff_hours,

			pl.timezone,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.postal_code
		from subscriptions s
		join subscription_plans sp on sp.id = s.plan_id
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where s.id = $1::uuid and s.buyer_token = $2
		limit 1
	`, subID, token).Scan(
		&out.ID,
		&out.PlanID,
		&out.StoreID,
		&out.Status,
		&out.CreatedAt,
		&out.Plan.Title,
		&out.Plan.Cadence,
		&out.Plan.PriceCents,
		&firstStartAt,
		&cutoffHours,
		&tz,
		&out.Plan.PickupLocation.Label,
		&out.Plan.PickupLocation.Address1,
		&out.Plan.PickupLocation.City,
		&out.Plan.PickupLocation.Region,
		&out.Plan.PickupLocation.Postal,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "subscription not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	out.Plan.PickupLocation.Timezone = tz

	loc, err := time.LoadLocation(tz)
	if err != nil {
		loc = time.UTC
	}
	out.Plan.NextStartAt = nextStartAt(time.Now().UTC(), firstStartAt, out.Plan.Cadence, loc, cutoffHours)

	resp.OK(w, GetBuyerSubscriptionResponse{Subscription: out})
}

type SetupPaymentMethodResponse struct {
	SetupIntentID string `json:"setup_intent_id"`
	ClientSecret  string `json:"client_secret"`
}

func (a BuyerSubscriptionsAPI) SetupPaymentMethod(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	subID := r.PathValue("subscriptionId")
	if subID == "" {
		resp.BadRequest(w, "missing subscriptionId")
		return
	}
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}

	var customerID string
	if err := a.DB.QueryRow(r.Context(), `
		select stripe_customer_id
		from subscriptions
		where id = $1::uuid and buyer_token = $2
		limit 1
	`, subID, token).Scan(&customerID); err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "subscription not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if strings.TrimSpace(customerID) == "" {
		resp.BadRequest(w, "missing stripe customer")
		return
	}

	siID, secret, err := a.Stripe.CreateSetupIntent(r.Context(), customerID, map[string]string{
		"subscription_id": subID,
	})
	if err != nil {
		resp.Internal(w, err)
		return
	}
	resp.OK(w, SetupPaymentMethodResponse{SetupIntentID: siID, ClientSecret: secret})
}

type ConfirmPaymentMethodRequest struct {
	SetupIntentID string `json:"setup_intent_id"`
}

func (a BuyerSubscriptionsAPI) ConfirmPaymentMethod(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	subID := r.PathValue("subscriptionId")
	if subID == "" {
		resp.BadRequest(w, "missing subscriptionId")
		return
	}
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}

	var in ConfirmPaymentMethodRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	setupID := strings.TrimSpace(in.SetupIntentID)
	if setupID == "" {
		resp.BadRequest(w, "setup_intent_id is required")
		return
	}

	var currentCustomer string
	if err := a.DB.QueryRow(r.Context(), `
		select stripe_customer_id
		from subscriptions
		where id = $1::uuid and buyer_token = $2
		limit 1
	`, subID, token).Scan(&currentCustomer); err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "subscription not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	si, err := a.Stripe.RetrieveSetupIntent(r.Context(), setupID)
	if err != nil {
		resp.BadRequest(w, "could not verify card setup")
		return
	}
	if si == nil || si.ID == "" || si.Customer == nil || si.Customer.ID == "" {
		resp.BadRequest(w, "invalid card setup")
		return
	}
	if si.Customer.ID != currentCustomer {
		resp.BadRequest(w, "card setup does not match subscription")
		return
	}
	if si.Status != "succeeded" || si.PaymentMethod == nil || si.PaymentMethod.ID == "" {
		resp.BadRequest(w, "card was not saved yet")
		return
	}

	if _, err := a.DB.Exec(r.Context(), `
		update subscriptions
		set stripe_payment_method_id = $3, updated_at = now()
		where id = $1::uuid and buyer_token = $2
	`, subID, token, si.PaymentMethod.ID); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{"ok": true})
}

type UpdateSubscriptionStatusRequest struct {
	Status string `json:"status"`
}

func (a BuyerSubscriptionsAPI) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	subID := r.PathValue("subscriptionId")
	if subID == "" {
		resp.BadRequest(w, "missing subscriptionId")
		return
	}
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		authz := strings.TrimSpace(r.Header.Get("Authorization"))
		parts := strings.SplitN(authz, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
			token = strings.TrimSpace(parts[1])
		}
	}
	if token == "" {
		resp.Unauthorized(w, "missing token")
		return
	}
	var in UpdateSubscriptionStatusRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	status := strings.TrimSpace(in.Status)
	if status != "active" && status != "paused" && status != "canceled" {
		resp.BadRequest(w, "invalid status")
		return
	}

	// For now: just set status. (Orders will be created only for active subscriptions.)
	cmd, err := a.DB.Exec(r.Context(), `
		update subscriptions
		set status = $3, updated_at = now()
		where id = $1::uuid and buyer_token = $2
	`, subID, token, status)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	if cmd.RowsAffected() == 0 {
		resp.Unauthorized(w, "subscription not found")
		return
	}

	resp.OK(w, map[string]any{"ok": true, "status": status})
}
