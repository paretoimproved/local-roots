package v1

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type BuyerSubscriptionsAPI struct {
	DB          *pgxpool.Pool
	Stripe      *stripepay.Client
	JWTSecret   string
	Email       *email.Client
	FrontendURL string
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
	if subID == "" || !validUUID(subID) {
		resp.BadRequest(w, "missing or invalid subscriptionId")
		return
	}

	bi := resolveBuyerAuth(r, a.JWTSecret)
	if !bi.isAuthenticated() {
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
		where s.id = $1::uuid
			and (
				($2::text is not null and s.buyer_token = $2)
				or ($3::uuid is not null and s.buyer_user_id = $3::uuid)
			)
		limit 1
	`, subID, bi.buyerToken, bi.userID).Scan(
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
	if subID == "" || !validUUID(subID) {
		resp.BadRequest(w, "missing or invalid subscriptionId")
		return
	}
	bi := resolveBuyerAuth(r, a.JWTSecret)
	if !bi.isAuthenticated() {
		resp.Unauthorized(w, "missing token")
		return
	}

	var customerID string
	if err := a.DB.QueryRow(r.Context(), `
		select stripe_customer_id
		from subscriptions
		where id = $1::uuid
			and (
				($2::text is not null and buyer_token = $2)
				or ($3::uuid is not null and buyer_user_id = $3::uuid)
			)
		limit 1
	`, subID, bi.buyerToken, bi.userID).Scan(&customerID); err != nil {
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
	if subID == "" || !validUUID(subID) {
		resp.BadRequest(w, "missing or invalid subscriptionId")
		return
	}
	bi := resolveBuyerAuth(r, a.JWTSecret)
	if !bi.isAuthenticated() {
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
		where id = $1::uuid
			and (
				($2::text is not null and buyer_token = $2)
				or ($3::uuid is not null and buyer_user_id = $3::uuid)
			)
		limit 1
	`, subID, bi.buyerToken, bi.userID).Scan(&currentCustomer); err != nil {
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
		set stripe_payment_method_id = $4, updated_at = now()
		where id = $1::uuid
			and (
				($2::text is not null and buyer_token = $2)
				or ($3::uuid is not null and buyer_user_id = $3::uuid)
			)
	`, subID, bi.buyerToken, bi.userID, si.PaymentMethod.ID); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{"ok": true})
}

type UpdateSubscriptionStatusRequest struct {
	Status       string `json:"status"`
	CancelReason string `json:"cancel_reason"`
}

func (a BuyerSubscriptionsAPI) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	subID := r.PathValue("subscriptionId")
	if subID == "" || !validUUID(subID) {
		resp.BadRequest(w, "missing or invalid subscriptionId")
		return
	}
	bi := resolveBuyerAuth(r, a.JWTSecret)
	if !bi.isAuthenticated() {
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

	cancelReason := strings.TrimSpace(in.CancelReason)

	// MVP behavior:
	// - update subscription status
	// - if canceling, also cancel the next upcoming order (if cutoff hasn't passed yet)
	note, err := a.updateStatusAndMaybeCancelUpcomingOrder(r.Context(), subID, bi, status, cancelReason)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.Unauthorized(w, "subscription not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	// Send cancellation confirmation email (fire-and-forget).
	if status == "canceled" && a.Email != nil && a.Email.Enabled() {
		go func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			var buyerEmail, planTitle, storeName string
			err := a.DB.QueryRow(bgCtx, `
				SELECT s.buyer_email, sp.title, st.name
				FROM subscriptions s
				JOIN subscription_plans sp ON sp.id = s.plan_id
				JOIN stores st ON st.id = s.store_id
				WHERE s.id = $1::uuid
			`, subID).Scan(&buyerEmail, &planTitle, &storeName)
			if err != nil {
				log.Printf("email: could not fetch subscription info for %s: %v", subID, err)
				return
			}
			subj, body := email.SubscriptionCanceled(planTitle, storeName)
			a.Email.SendAsync(buyerEmail, subj, body)
		}()
	}

	out := map[string]any{"ok": true, "status": status}
	if strings.TrimSpace(note) != "" {
		out["note"] = note
	}
	resp.OK(w, out)
}

func (a BuyerSubscriptionsAPI) updateStatusAndMaybeCancelUpcomingOrder(ctx context.Context, subID string, bi buyerIdentity, status string, cancelReason string) (note string, err error) {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	// Ensure auth matches and lock the subscription row.
	var storeID string
	if err := tx.QueryRow(ctx, `
		select store_id::text
		from subscriptions
		where id = $1::uuid
			and (
				($2::text is not null and buyer_token = $2)
				or ($3::uuid is not null and buyer_user_id = $3::uuid)
			)
		limit 1
		for update
	`, subID, bi.buyerToken, bi.userID).Scan(&storeID); err != nil {
		return "", err
	}

	if _, err := tx.Exec(ctx, `
		update subscriptions
		set status = $4,
			canceled_at  = case when $4 = 'canceled' then now() else canceled_at end,
			cancel_reason = case when $4 = 'canceled' then nullif($5, '') else cancel_reason end,
			paused_at    = case when $4 = 'paused'   then now() else paused_at end,
			updated_at   = now()
		where id = $1::uuid
			and (
				($2::text is not null and buyer_token = $2)
				or ($3::uuid is not null and buyer_user_id = $3::uuid)
			)
	`, subID, bi.buyerToken, bi.userID, status, cancelReason); err != nil {
		return "", err
	}

	if status != "canceled" {
		if err := tx.Commit(ctx); err != nil {
			return "", err
		}
		return "", nil
	}

	// Cancel the next upcoming order if it is still before cutoff.
	var (
		orderID        string
		paymentMethod  string
		paymentStatus  string
		stripePI       *string
		cutoffAt       time.Time
	)
	row := tx.QueryRow(ctx, `
		select
			o.id::text,
			o.payment_method,
			o.payment_status,
			o.stripe_payment_intent_id,
			w.cutoff_at
		from orders o
		join pickup_windows w on w.id = o.pickup_window_id and w.store_id = o.store_id
		where o.subscription_id = $1::uuid
			and o.status in ('placed', 'ready')
		order by w.start_at asc
		limit 1
		for update
	`, subID)
	if err := row.Scan(&orderID, &paymentMethod, &paymentStatus, &stripePI, &cutoffAt); err != nil {
		if err == pgx.ErrNoRows {
			// No upcoming orders to cancel.
			if err := tx.Commit(ctx); err != nil {
				return "", err
			}
			return "Subscription canceled. No upcoming pickup to cancel.", nil
		}
		return "", err
	}

	if time.Now().After(cutoffAt) {
		// Keep subscription canceled, but do not cancel the order once cutoff passes.
		if err := tx.Commit(ctx); err != nil {
			return "", err
		}
		return "Subscription canceled. The next pickup is already locked in (cutoff passed).", nil
	}

	needsVoid := paymentMethod == "card" && paymentStatus == "authorized" && stripePI != nil && strings.TrimSpace(*stripePI) != ""
	if needsVoid {
		if a.Stripe == nil || !a.Stripe.Enabled() {
			return "", stripepay.ErrNotConfigured
		}
	}

	// Release reserved inventory and cancel the order.
	if err := adjustOfferingsForOrder(ctx, tx, orderID, "release"); err != nil {
		return "", err
	}
	if _, err := tx.Exec(ctx, `
		update orders
		set
			status = 'canceled',
			payment_status = case
				when payment_method = 'card' and stripe_payment_intent_id is not null then 'voided'
				else payment_status
			end,
			updated_at = now()
		where id = $1::uuid
	`, orderID); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	// Void Stripe authorization after commit. If this fails, the webhook will reconcile.
	if needsVoid {
		_ = a.Stripe.CancelPaymentIntent(ctx, strings.TrimSpace(*stripePI), "void-"+orderID)
	}

	return "Subscription canceled and the next upcoming pickup order was canceled.", nil
}
