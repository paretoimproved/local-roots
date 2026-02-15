package v1

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	stripe "github.com/stripe/stripe-go/v78"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
	"github.com/paretoimproved/local-roots/backend/internal/timeutil"
)

type SubscriptionAPI struct {
	DB              *pgxpool.Pool
	Stripe          *stripepay.Client
	BuyerFeeBps     int
	BuyerFeeFlatCts int
}

type SellerSubscriptionAPI struct {
	DB              *pgxpool.Pool
	Stripe          *stripepay.Client
	BuyerFeeBps     int
	BuyerFeeFlatCts int
}

type SubscriptionPlanPublic struct {
	ID              string    `json:"id"`
	StoreID         string    `json:"store_id"`
	Title           string    `json:"title"`
	Description     *string   `json:"description"`
	Cadence         string    `json:"cadence"`
	PriceCents      int       `json:"price_cents"`
	SubscriberLimit int       `json:"subscriber_limit"`
	FirstStartAt    time.Time `json:"first_start_at"`
	DurationMin     int       `json:"duration_minutes"`
	CutoffHours     int       `json:"cutoff_hours"`
	IsActive        bool      `json:"is_active"`
	IsLive          bool      `json:"is_live"`
	NextStartAt     time.Time `json:"next_start_at"`
	PickupLocation  struct {
		ID       string  `json:"id"`
		Label    *string `json:"label"`
		Address1 string  `json:"address1"`
		City     string  `json:"city"`
		Region   string  `json:"region"`
		Postal   string  `json:"postal_code"`
		Timezone string  `json:"timezone"`
	} `json:"pickup_location"`
}

func (a SubscriptionAPI) ListStorePlans(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" || !validUUID(storeID) {
		resp.BadRequest(w, "missing or invalid storeId")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select
			sp.id::text,
			sp.store_id::text,
			sp.title,
			sp.description,
			sp.cadence,
			sp.price_cents,
			sp.subscriber_limit,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active,
			sp.is_live,
			pl.id::text,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.postal_code,
			pl.timezone
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.store_id = $1::uuid
			and sp.is_active = true
			and sp.is_live = true
		order by sp.created_at desc
		limit 50
	`, storeID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	now := time.Now().UTC()
	out := make([]SubscriptionPlanPublic, 0)
	for rows.Next() {
		var sp SubscriptionPlanPublic
		if err := rows.Scan(
			&sp.ID,
			&sp.StoreID,
			&sp.Title,
			&sp.Description,
			&sp.Cadence,
			&sp.PriceCents,
			&sp.SubscriberLimit,
			&sp.FirstStartAt,
			&sp.DurationMin,
			&sp.CutoffHours,
			&sp.IsActive,
			&sp.IsLive,
			&sp.PickupLocation.ID,
			&sp.PickupLocation.Label,
			&sp.PickupLocation.Address1,
			&sp.PickupLocation.City,
			&sp.PickupLocation.Region,
			&sp.PickupLocation.Postal,
			&sp.PickupLocation.Timezone,
		); err != nil {
			resp.Internal(w, err)
			return
		}

		loc, err := time.LoadLocation(sp.PickupLocation.Timezone)
		if err != nil {
			loc = time.UTC
		}
		sp.NextStartAt = nextStartAt(now, sp.FirstStartAt, sp.Cadence, loc, sp.CutoffHours)
		out = append(out, sp)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

func (a SubscriptionAPI) GetPlan(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	var sp SubscriptionPlanPublic
	err := a.DB.QueryRow(r.Context(), `
		select
			sp.id::text,
			sp.store_id::text,
			sp.title,
			sp.description,
			sp.cadence,
			sp.price_cents,
			sp.subscriber_limit,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active,
			sp.is_live,
			pl.id::text,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.postal_code,
			pl.timezone
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.id = $1::uuid
		limit 1
	`, planID).Scan(
		&sp.ID,
		&sp.StoreID,
		&sp.Title,
		&sp.Description,
		&sp.Cadence,
		&sp.PriceCents,
		&sp.SubscriberLimit,
		&sp.FirstStartAt,
		&sp.DurationMin,
		&sp.CutoffHours,
		&sp.IsActive,
		&sp.IsLive,
		&sp.PickupLocation.ID,
		&sp.PickupLocation.Label,
		&sp.PickupLocation.Address1,
		&sp.PickupLocation.City,
		&sp.PickupLocation.Region,
		&sp.PickupLocation.Postal,
		&sp.PickupLocation.Timezone,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	loc, err := time.LoadLocation(sp.PickupLocation.Timezone)
	if err != nil {
		loc = time.UTC
	}
	sp.NextStartAt = nextStartAt(time.Now().UTC(), sp.FirstStartAt, sp.Cadence, loc, sp.CutoffHours)
	resp.OK(w, sp)
}

type CheckoutRequest struct {
	Buyer struct {
		Email string  `json:"email"`
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	} `json:"buyer"`
}

type CheckoutResponse struct {
	Mode              string `json:"mode"` // "payment_intent" | "setup_intent"
	ID                string `json:"id"`
	ClientSecret      string `json:"client_secret"`
	SubtotalCents     int    `json:"subtotal_cents"`
	BuyerFeeCents     int    `json:"buyer_fee_cents"`
	BuyerFeeBps       int    `json:"buyer_fee_bps"`
	BuyerFeeFlatCents int    `json:"buyer_fee_flat_cents"`
	TotalCents        int    `json:"total_cents"`
}

func computeBuyerFee(subtotalCents, bps, flatCts int) (feeCents, totalCents int) {
	if subtotalCents < 0 {
		subtotalCents = 0
	}
	if bps < 0 {
		bps = 0
	}
	if flatCts < 0 {
		flatCts = 0
	}
	fee := (subtotalCents * bps) / 10000
	fee += flatCts
	if fee < 0 {
		fee = 0
	}
	total := subtotalCents + fee
	if total < 0 {
		total = 0
	}
	return fee, total
}

type Subscription struct {
	ID         string    `json:"id"`
	PlanID     string    `json:"plan_id"`
	StoreID    string    `json:"store_id"`
	BuyerToken string    `json:"buyer_token"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

type SubscribeResponse struct {
	Subscription Subscription `json:"subscription"`
	FirstOrder   Order        `json:"first_order"`
}

func (a SubscriptionAPI) Checkout(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}

	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	var in CheckoutRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	buyerEmail := strings.ToLower(strings.TrimSpace(in.Buyer.Email))
	if buyerEmail == "" || !strings.Contains(buyerEmail, "@") {
		resp.BadRequest(w, "invalid buyer email")
		return
	}

	// Load plan + location.
	var (
		storeID          string
		locationTimezone string
		cadence          string
		priceCents       int
		firstStartAt     time.Time
		durationMin      int
		cutoffHours      int
		isActive         bool
		isLive           bool
	)
	if err := a.DB.QueryRow(r.Context(), `
		select
			sp.store_id::text,
			pl.timezone,
			sp.cadence,
			sp.price_cents,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active,
			sp.is_live
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.id = $1::uuid
		limit 1
	`, planID).Scan(
		&storeID,
		&locationTimezone,
		&cadence,
		&priceCents,
		&firstStartAt,
		&durationMin,
		&cutoffHours,
		&isActive,
		&isLive,
	); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if !isActive {
		resp.BadRequest(w, "plan is not active")
		return
	}
	if !isLive {
		resp.BadRequest(w, "plan is not live yet")
		return
	}
	if priceCents <= 0 {
		resp.BadRequest(w, "plan price must be greater than $0.00")
		return
	}

	loc, err := time.LoadLocation(locationTimezone)
	if err != nil {
		loc = time.UTC
	}

	now := time.Now().UTC()
	nextStart := nextStartAt(now, firstStartAt, cadence, loc, cutoffHours)
	endAt := nextStart.Add(time.Duration(durationMin) * time.Minute)
	withinAuthWindow := endAt.Sub(now) <= 7*24*time.Hour

	ctx := r.Context()
	cusID, err := a.Stripe.FindOrCreateCustomer(ctx, buyerEmail, in.Buyer.Name, in.Buyer.Phone)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	if withinAuthWindow {
		feeCents, totalCents := computeBuyerFee(priceCents, a.BuyerFeeBps, a.BuyerFeeFlatCts)
		piID, secret, err := a.Stripe.CreateCheckoutPaymentIntent(ctx, stripepay.CreateCheckoutPaymentIntentInput{
			AmountCents: totalCents,
			Currency:    "usd",
			CustomerID:  cusID,
			Metadata: map[string]string{
				"plan_id":  planID,
				"store_id": storeID,
			},
		})
		if err != nil {
			resp.Internal(w, err)
			return
		}
		resp.OK(w, CheckoutResponse{
			Mode:              "payment_intent",
			ID:                piID,
			ClientSecret:      secret,
			SubtotalCents:     priceCents,
			BuyerFeeCents:     feeCents,
			BuyerFeeBps:       a.BuyerFeeBps,
			BuyerFeeFlatCents: a.BuyerFeeFlatCts,
			TotalCents:        totalCents,
		})
		return
	}

	siID, secret, err := a.Stripe.CreateSetupIntent(ctx, cusID, map[string]string{
		"plan_id":  planID,
		"store_id": storeID,
	})
	if err != nil {
		resp.Internal(w, err)
		return
	}
	feeCents, totalCents := computeBuyerFee(priceCents, a.BuyerFeeBps, a.BuyerFeeFlatCts)
	resp.OK(w, CheckoutResponse{
		Mode:              "setup_intent",
		ID:                siID,
		ClientSecret:      secret,
		SubtotalCents:     priceCents,
		BuyerFeeCents:     feeCents,
		BuyerFeeBps:       a.BuyerFeeBps,
		BuyerFeeFlatCents: a.BuyerFeeFlatCts,
		TotalCents:        totalCents,
	})
}

func (a SubscriptionAPI) Subscribe(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	type SubscribeRequest struct {
		PaymentIntentID string `json:"payment_intent_id"`
		SetupIntentID   string `json:"setup_intent_id"`
		Buyer           struct {
			Email string  `json:"email"`
			Name  *string `json:"name"`
			Phone *string `json:"phone"`
		} `json:"buyer"`
	}

	var in SubscribeRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	buyerEmail := strings.ToLower(strings.TrimSpace(in.Buyer.Email))
	if buyerEmail == "" || !strings.Contains(buyerEmail, "@") {
		resp.BadRequest(w, "invalid buyer email")
		return
	}

	paymentIntentID := strings.TrimSpace(in.PaymentIntentID)
	setupIntentID := strings.TrimSpace(in.SetupIntentID)
	if paymentIntentID == "" && setupIntentID == "" {
		resp.BadRequest(w, "payment_intent_id or setup_intent_id is required")
		return
	}
	if paymentIntentID != "" && setupIntentID != "" {
		resp.BadRequest(w, "provide only one of payment_intent_id or setup_intent_id")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	// Load plan + location.
	var (
		storeID          string
		locationID       string
		locationTimezone string
		productID        string
		cadence          string
		priceCents       int
		subscriberLimit  int
		firstStartAt     time.Time
		durationMin      int
		cutoffHours      int
		isActive         bool
		isLive           bool
	)
	if err := tx.QueryRow(ctx, `
		select
			sp.store_id::text,
			sp.pickup_location_id::text,
			pl.timezone,
			sp.product_id::text,
			sp.cadence,
			sp.price_cents,
			sp.subscriber_limit,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active
			, sp.is_live
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.id = $1::uuid
		limit 1
	`, planID).Scan(
		&storeID,
		&locationID,
		&locationTimezone,
		&productID,
		&cadence,
		&priceCents,
		&subscriberLimit,
		&firstStartAt,
		&durationMin,
		&cutoffHours,
		&isActive,
		&isLive,
	); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if !isActive {
		resp.BadRequest(w, "plan is not active")
		return
	}
	if !isLive {
		resp.BadRequest(w, "plan is not live yet")
		return
	}

	var (
		stripeCustomerID   string
		stripePMID         string
		orderPaymentStatus string
		orderStripePI      *string
	)

	if paymentIntentID != "" {
		// Validate the authorized Stripe PaymentIntent matches this plan.
		pi, err := a.Stripe.RetrievePaymentIntent(ctx, paymentIntentID)
		if err != nil {
			resp.BadRequest(w, "could not verify payment authorization")
			return
		}
		if pi == nil || pi.ID == "" {
			resp.BadRequest(w, "invalid payment authorization")
			return
		}
		if pi.Metadata != nil {
			if v, ok := pi.Metadata["plan_id"]; ok && v != "" && v != planID {
				resp.BadRequest(w, "payment authorization does not match this plan")
				return
			}
		}
		if pi.Amount != int64(priceCents) {
			resp.BadRequest(w, "payment authorization amount does not match")
			return
		}
		if pi.Status != stripe.PaymentIntentStatusRequiresCapture {
			resp.BadRequest(w, "payment is not authorized yet")
			return
		}
		if pi.PaymentMethod == nil || pi.PaymentMethod.ID == "" {
			resp.BadRequest(w, "payment method missing")
			return
		}
		if pi.Customer == nil || pi.Customer.ID == "" {
			resp.BadRequest(w, "payment customer missing")
			return
		}
		stripeCustomerID = pi.Customer.ID
		stripePMID = pi.PaymentMethod.ID
		orderPaymentStatus = "authorized"
		orderStripePI = &paymentIntentID
	} else {
		si, err := a.Stripe.RetrieveSetupIntent(ctx, setupIntentID)
		if err != nil {
			resp.BadRequest(w, "could not verify card setup")
			return
		}
		if si == nil || si.ID == "" {
			resp.BadRequest(w, "invalid card setup")
			return
		}
		if si.Metadata != nil {
			if v, ok := si.Metadata["plan_id"]; ok && v != "" && v != planID {
				resp.BadRequest(w, "card setup does not match this plan")
				return
			}
		}
		if si.Status != stripe.SetupIntentStatusSucceeded {
			resp.BadRequest(w, "card was not saved yet")
			return
		}
		if si.PaymentMethod == nil || si.PaymentMethod.ID == "" {
			resp.BadRequest(w, "payment method missing")
			return
		}
		if si.Customer == nil || si.Customer.ID == "" {
			resp.BadRequest(w, "payment customer missing")
			return
		}
		stripeCustomerID = si.Customer.ID
		stripePMID = si.PaymentMethod.ID
		orderPaymentStatus = "pending"
		orderStripePI = nil
	}

	// Enforce subscriber limit (only counts active subscriptions).
	var activeCount int
	if err := tx.QueryRow(ctx, `
		select count(1)
		from subscriptions
		where plan_id = $1::uuid and status = 'active'
	`, planID).Scan(&activeCount); err != nil {
		resp.Internal(w, err)
		return
	}
	if activeCount >= subscriberLimit {
		// Best-effort: void authorization.
		if paymentIntentID != "" {
			_ = a.Stripe.CancelPaymentIntent(ctx, paymentIntentID, "cancel-plan-full-"+paymentIntentID)
		}
		resp.BadRequest(w, "this box is currently full")
		return
	}

	var sub Subscription
	err = tx.QueryRow(ctx, `
		insert into subscriptions (
			plan_id, store_id, buyer_email, buyer_name, buyer_phone, status,
			stripe_customer_id, stripe_payment_method_id
		)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'active', $6, $7)
		returning id::text, plan_id::text, store_id::text, buyer_token, status, created_at
	`, planID, storeID, buyerEmail, in.Buyer.Name, in.Buyer.Phone, stripeCustomerID, stripePMID).Scan(
		&sub.ID,
		&sub.PlanID,
		&sub.StoreID,
		&sub.BuyerToken,
		&sub.Status,
		&sub.CreatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	loc, err := time.LoadLocation(locationTimezone)
	if err != nil {
		loc = time.UTC
	}

	// Ensure there's an upcoming cycle + offering.
	nextStart := nextStartAt(time.Now().UTC(), firstStartAt, cadence, loc, cutoffHours)
	windowID, offeringID, err := ensureCycleAndOffering(ctx, tx, ensureCycleInput{
		planID:          planID,
		storeID:         storeID,
		locationID:      locationID,
		productID:       productID,
		priceCents:      priceCents,
		subscriberLimit: subscriberLimit,
		startAt:         nextStart,
		durationMin:     durationMin,
		cutoffHours:     cutoffHours,
	})
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Create an order for this subscription for the upcoming pickup window.
	order, err := createOrderForOffering(ctx, tx, createOrderForOfferingInput{
		storeID:               storeID,
		pickupWindowID:        windowID,
		offeringID:            offeringID,
		subscriptionID:        &sub.ID,
		buyerEmail:            buyerEmail,
		buyerName:             in.Buyer.Name,
		buyerPhone:            in.Buyer.Phone,
		quantity:              1,
		paymentMethod:         "card",
		paymentStatus:         orderPaymentStatus,
		stripePaymentIntentID: orderStripePI,
		buyerFeeBps:           a.BuyerFeeBps,
		buyerFeeFlatCts:       a.BuyerFeeFlatCts,
	})
	if err != nil {
		if errors.Is(err, errInsufficientInventory) {
			// Best-effort: void authorization.
			if paymentIntentID != "" {
				_ = a.Stripe.CancelPaymentIntent(ctx, paymentIntentID, "cancel-inventory-"+paymentIntentID)
			}
			resp.BadRequest(w, "this box is currently full")
			return
		}
		resp.Internal(w, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, SubscribeResponse{Subscription: sub, FirstOrder: order})
}

// --- seller ---

type SubscriptionPlanSeller struct {
	ID               string    `json:"id"`
	StoreID          string    `json:"store_id"`
	PickupLocationID string    `json:"pickup_location_id"`
	ProductID        string    `json:"product_id"`
	Title            string    `json:"title"`
	Description      *string   `json:"description"`
	Cadence          string    `json:"cadence"`
	PriceCents       int       `json:"price_cents"`
	SubscriberLimit  int       `json:"subscriber_limit"`
	FirstStartAt     time.Time `json:"first_start_at"`
	DurationMin      int       `json:"duration_minutes"`
	CutoffHours      int       `json:"cutoff_hours"`
	IsActive         bool      `json:"is_active"`
	IsLive           bool      `json:"is_live"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	NextStartAt      time.Time `json:"next_start_at"`
	PickupLocation   struct {
		ID       string  `json:"id"`
		Label    *string `json:"label"`
		Address1 string  `json:"address1"`
		City     string  `json:"city"`
		Region   string  `json:"region"`
		Postal   string  `json:"postal_code"`
		Timezone string  `json:"timezone"`
	} `json:"pickup_location"`
}

func (a SellerSubscriptionAPI) ListPlans(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	rows, err := a.DB.Query(r.Context(), `
		select
			sp.id::text,
			sp.store_id::text,
			sp.pickup_location_id::text,
			sp.product_id::text,
			sp.title,
			sp.description,
			sp.cadence,
			sp.price_cents,
			sp.subscriber_limit,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active,
			sp.is_live,
			sp.created_at,
			sp.updated_at,
			pl.id::text,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.postal_code,
			pl.timezone
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.store_id = $1::uuid
		order by sp.created_at desc
		limit 50
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	now := time.Now().UTC()
	out := make([]SubscriptionPlanSeller, 0)
	for rows.Next() {
		var sp SubscriptionPlanSeller
		if err := rows.Scan(
			&sp.ID,
			&sp.StoreID,
			&sp.PickupLocationID,
			&sp.ProductID,
			&sp.Title,
			&sp.Description,
			&sp.Cadence,
			&sp.PriceCents,
			&sp.SubscriberLimit,
			&sp.FirstStartAt,
			&sp.DurationMin,
			&sp.CutoffHours,
			&sp.IsActive,
			&sp.IsLive,
			&sp.CreatedAt,
			&sp.UpdatedAt,
			&sp.PickupLocation.ID,
			&sp.PickupLocation.Label,
			&sp.PickupLocation.Address1,
			&sp.PickupLocation.City,
			&sp.PickupLocation.Region,
			&sp.PickupLocation.Postal,
			&sp.PickupLocation.Timezone,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		loc, err := time.LoadLocation(sp.PickupLocation.Timezone)
		if err != nil {
			loc = time.UTC
		}
		sp.NextStartAt = nextStartAt(now, sp.FirstStartAt, sp.Cadence, loc, sp.CutoffHours)
		out = append(out, sp)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type CreatePlanRequest struct {
	PickupLocationID  string  `json:"pickup_location_id"`
	Title             string  `json:"title"`
	Description       *string `json:"description"`
	Cadence           string  `json:"cadence"`
	PriceCents        int     `json:"price_cents"`
	SubscriberLimit   int     `json:"subscriber_limit"`
	FirstStartAtLocal string  `json:"first_start_at_local"` // e.g. "2026-02-14T10:30"
	DurationMinutes   int     `json:"duration_minutes"`
	CutoffHours       int     `json:"cutoff_hours"`
}

func (a SellerSubscriptionAPI) CreatePlan(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in CreatePlanRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Cadence = strings.TrimSpace(in.Cadence)
	in.PickupLocationID = strings.TrimSpace(in.PickupLocationID)
	in.FirstStartAtLocal = strings.TrimSpace(in.FirstStartAtLocal)

	if in.Title == "" {
		resp.BadRequest(w, "title is required")
		return
	}
	if in.Cadence != "weekly" && in.Cadence != "biweekly" && in.Cadence != "monthly" {
		resp.BadRequest(w, "cadence must be weekly, biweekly, or monthly")
		return
	}
	if in.PriceCents < 0 {
		resp.BadRequest(w, "price_cents must be >= 0")
		return
	}
	if in.SubscriberLimit <= 0 {
		resp.BadRequest(w, "subscriber_limit must be > 0")
		return
	}
	if in.PickupLocationID == "" {
		resp.BadRequest(w, "pickup_location_id is required")
		return
	}
	if in.FirstStartAtLocal == "" {
		resp.BadRequest(w, "first_start_at_local is required")
		return
	}
	if in.DurationMinutes <= 0 {
		in.DurationMinutes = 120
	}
	if in.CutoffHours < 0 {
		in.CutoffHours = 24
	}

	// Ensure location belongs to store and get timezone.
	var locTimezone string
	if err := a.DB.QueryRow(r.Context(), `
		select timezone
		from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
		limit 1
	`, in.PickupLocationID, sc.StoreID).Scan(&locTimezone); err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "pickup location not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	loc, normalizedTZ, err := timeutil.LoadLocationBestEffort(locTimezone)
	if err != nil {
		log.Printf("invalid pickup location timezone store_id=%s pickup_location_id=%s raw=%q", sc.StoreID, in.PickupLocationID, locTimezone)
		resp.BadRequest(w, fmt.Sprintf("invalid pickup location timezone: %q", strings.TrimSpace(locTimezone)))
		return
	}
	// Best-effort cleanup: normalize any legacy / friendly tz strings in the DB.
	if normalizedTZ != "" && strings.TrimSpace(locTimezone) != normalizedTZ {
		_, _ = a.DB.Exec(r.Context(), `
			update pickup_locations
			set timezone = $3, updated_at = now()
			where id = $1::uuid and store_id = $2::uuid
		`, in.PickupLocationID, sc.StoreID, normalizedTZ)
	}

	firstLocal, err := time.ParseInLocation("2006-01-02T15:04", in.FirstStartAtLocal, loc)
	if err != nil {
		resp.BadRequest(w, "invalid first_start_at_local (expected YYYY-MM-DDTHH:MM)")
		return
	}
	firstUTC := firstLocal.UTC()

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	// Create an internal product to represent this curated box.
	var productID string
	unit := "box"
	if err := tx.QueryRow(ctx, `
		insert into products (store_id, title, description, unit, is_perishable, is_active)
		values ($1::uuid, $2, $3, $4, true, true)
		returning id::text
	`, sc.StoreID, in.Title, in.Description, unit).Scan(&productID); err != nil {
		resp.Internal(w, err)
		return
	}

	var out SubscriptionPlanSeller
	out.PickupLocationID = in.PickupLocationID
	out.ProductID = productID
	out.StoreID = sc.StoreID
	out.Title = in.Title
	out.Description = in.Description
	out.Cadence = in.Cadence
	out.PriceCents = in.PriceCents
	out.SubscriberLimit = in.SubscriberLimit
	out.FirstStartAt = firstUTC
	out.DurationMin = in.DurationMinutes
	out.CutoffHours = in.CutoffHours
	out.IsActive = true
	out.IsLive = false

	if err := tx.QueryRow(ctx, `
		insert into subscription_plans (
			store_id, pickup_location_id, product_id, title, description, cadence, price_cents, subscriber_limit,
			first_start_at, duration_minutes, cutoff_hours, is_active
		)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, true)
		returning id::text, created_at, updated_at
	`, sc.StoreID, in.PickupLocationID, productID, in.Title, in.Description, in.Cadence, in.PriceCents, in.SubscriberLimit, firstUTC, in.DurationMinutes, in.CutoffHours).Scan(
		&out.ID,
		&out.CreatedAt,
		&out.UpdatedAt,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	// Populate pickup location for response.
	if err := tx.QueryRow(ctx, `
		select id::text, label, address1, city, region, postal_code, timezone
		from pickup_locations
		where id = $1::uuid
		limit 1
	`, in.PickupLocationID).Scan(
		&out.PickupLocation.ID,
		&out.PickupLocation.Label,
		&out.PickupLocation.Address1,
		&out.PickupLocation.City,
		&out.PickupLocation.Region,
		&out.PickupLocation.Postal,
		&out.PickupLocation.Timezone,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	out.NextStartAt = nextStartAt(time.Now().UTC(), out.FirstStartAt, out.Cadence, loc, out.CutoffHours)

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

type GenerateCycleResponse struct {
	PickupWindowID string `json:"pickup_window_id"`
	OfferingID     string `json:"offering_id"`
	OrdersCreated  int    `json:"orders_created"`
	StartAt        string `json:"start_at"`
}

func (a SellerSubscriptionAPI) GenerateNextCycle(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}

	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var (
		locationID       string
		locationTimezone string
		productID        string
		cadence          string
		priceCents       int
		subscriberLimit  int
		firstStartAt     time.Time
		durationMin      int
		cutoffHours      int
		isActive         bool
	)
	if err := tx.QueryRow(ctx, `
		select
			sp.pickup_location_id::text,
			pl.timezone,
			sp.product_id::text,
			sp.cadence,
			sp.price_cents,
			sp.subscriber_limit,
			sp.first_start_at,
			sp.duration_minutes,
			sp.cutoff_hours,
			sp.is_active
		from subscription_plans sp
		join pickup_locations pl on pl.id = sp.pickup_location_id
		where sp.id = $1::uuid and sp.store_id = $2::uuid
		limit 1
	`, planID, sc.StoreID).Scan(
		&locationID,
		&locationTimezone,
		&productID,
		&cadence,
		&priceCents,
		&subscriberLimit,
		&firstStartAt,
		&durationMin,
		&cutoffHours,
		&isActive,
	); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if !isActive {
		resp.BadRequest(w, "plan is not active")
		return
	}

	loc, err := time.LoadLocation(locationTimezone)
	if err != nil {
		loc = time.UTC
	}

	// Determine next cycle based on latest cycle start, else first_start_at.
	var (
		lastStart    time.Time
		hasLastStart bool
	)
	err = tx.QueryRow(ctx, `
		select start_at
		from subscription_cycles
		where plan_id = $1::uuid
		order by start_at desc
		limit 1
	`, planID).Scan(&lastStart)
	if err != nil && err != pgx.ErrNoRows {
		resp.Internal(w, err)
		return
	}
	if err == nil {
		hasLastStart = true
	}

	now := time.Now().UTC()
	next := nextStartAt(now, firstStartAt, cadence, loc, cutoffHours)
	if hasLastStart {
		next = addCadence(lastStart, cadence, loc).UTC()
		for !next.After(now) {
			next = addCadence(next, cadence, loc).UTC()
		}
	}
	endAt := next.Add(time.Duration(durationMin) * time.Minute)
	withinAuthWindow := endAt.Sub(now) <= 7*24*time.Hour

	windowID, offeringID, err := ensureCycleAndOffering(ctx, tx, ensureCycleInput{
		planID:          planID,
		storeID:         sc.StoreID,
		locationID:      locationID,
		productID:       productID,
		priceCents:      priceCents,
		subscriberLimit: subscriberLimit,
		startAt:         next,
		durationMin:     durationMin,
		cutoffHours:     cutoffHours,
	})
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Phase 1: Create orders for all active subscriptions with payment_status='pending'
	// inside the transaction. Stripe calls happen in Phase 2 after commit.
	type pendingAuth struct {
		orderID          string
		stripeCustomerID string
		stripePMID       string
		subID            string
	}

	rows, err := tx.Query(ctx, `
		select
			s.id::text,
			s.buyer_email,
			s.buyer_name,
			s.buyer_phone,
			s.stripe_customer_id,
			s.stripe_payment_method_id
		from subscriptions s
		left join orders o
			on o.subscription_id = s.id
			and o.pickup_window_id = $2::uuid
		where s.plan_id = $1::uuid
			and s.status = 'active'
			and o.id is null
		order by s.created_at asc
		limit 500
	`, planID, windowID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	var authQueue []pendingAuth
	created := 0
	for rows.Next() {
		var (
			subID            string
			email            string
			name             *string
			phone            *string
			stripeCustomerID *string
			stripePMID       *string
		)
		if err := rows.Scan(&subID, &email, &name, &phone, &stripeCustomerID, &stripePMID); err != nil {
			resp.Internal(w, err)
			return
		}

		if stripeCustomerID == nil || stripePMID == nil || *stripeCustomerID == "" || *stripePMID == "" {
			continue
		}

		order, err := createOrderForOffering(ctx, tx, createOrderForOfferingInput{
			storeID:         sc.StoreID,
			pickupWindowID:  windowID,
			offeringID:      offeringID,
			subscriptionID:  &subID,
			buyerEmail:      email,
			buyerName:       name,
			buyerPhone:      phone,
			quantity:        1,
			paymentMethod:   "card",
			paymentStatus:   "pending",
			buyerFeeBps:     a.BuyerFeeBps,
			buyerFeeFlatCts: a.BuyerFeeFlatCts,
		})
		if err != nil {
			if errors.Is(err, errInsufficientInventory) {
				resp.BadRequest(w, "subscriber limit exceeded for this cycle")
				return
			}
			resp.Internal(w, err)
			return
		}
		created++

		if withinAuthWindow {
			authQueue = append(authQueue, pendingAuth{
				orderID:          order.ID,
				stripeCustomerID: *stripeCustomerID,
				stripePMID:       *stripePMID,
				subID:            subID,
			})
		}
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	// Once a cycle exists, the plan is eligible for buyers. This is our MVP "go live" gate.
	if _, err := tx.Exec(ctx, `
		update subscription_plans
		set is_live = true
		where id = $1::uuid and store_id = $2::uuid
	`, planID, sc.StoreID); err != nil {
		resp.Internal(w, err)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	// Phase 2: Attempt Stripe authorizations outside the transaction.
	// Failed Stripe calls leave orders as 'pending' for the AuthorizePending cron to retry.
	_, totalCents := computeBuyerFee(priceCents, a.BuyerFeeBps, a.BuyerFeeFlatCts)
	for _, pa := range authQueue {
		piID, piStatus, err := a.Stripe.CreateOffSessionAuthorization(ctx, stripepay.CreateOffSessionPaymentIntentInput{
			AmountCents:     totalCents,
			Currency:        "usd",
			CustomerID:      pa.stripeCustomerID,
			PaymentMethodID: pa.stripePMID,
			Metadata: map[string]string{
				"plan_id":          planID,
				"store_id":         sc.StoreID,
				"subscription_id":  pa.subID,
				"pickup_window_id": windowID,
			},
			IdempotencyKey: "auth-" + windowID + "-" + pa.subID,
		})
		if err != nil {
			continue
		}
		if piStatus != string(stripe.PaymentIntentStatusRequiresCapture) {
			_ = a.Stripe.CancelPaymentIntent(ctx, piID, "cancel-"+piID)
			continue
		}
		// Update the order with the authorized PaymentIntent.
		_, _ = a.DB.Exec(ctx, `
			update orders
			set payment_status = 'authorized',
				stripe_payment_intent_id = $2,
				updated_at = now()
			where id = $1::uuid
		`, pa.orderID, piID)
	}

	resp.OK(w, GenerateCycleResponse{
		PickupWindowID: windowID,
		OfferingID:     offeringID,
		OrdersCreated:  created,
		StartAt:        next.Format(time.RFC3339),
	})
}

// --- internals ---

func nextStartAt(nowUTC time.Time, firstUTC time.Time, cadence string, loc *time.Location, cutoffHours int) time.Time {
	n := nowUTC.In(loc)
	t := firstUTC.In(loc)
	// Find the first cycle that starts after now AND whose cutoff is still in the future.
	for !t.After(n) || !t.Add(-time.Duration(cutoffHours)*time.Hour).After(n) {
		switch cadence {
		case "weekly":
			t = t.AddDate(0, 0, 7)
		case "biweekly":
			t = t.AddDate(0, 0, 14)
		case "monthly":
			t = t.AddDate(0, 1, 0)
		default:
			t = t.AddDate(0, 0, 7)
		}
	}
	return t.UTC()
}

func addCadence(tUTC time.Time, cadence string, loc *time.Location) time.Time {
	t := tUTC.In(loc)
	switch cadence {
	case "weekly":
		t = t.AddDate(0, 0, 7)
	case "biweekly":
		t = t.AddDate(0, 0, 14)
	case "monthly":
		t = t.AddDate(0, 1, 0)
	default:
		t = t.AddDate(0, 0, 7)
	}
	return t.UTC()
}

var errInsufficientInventory = errors.New("insufficient inventory")

type ensureCycleInput struct {
	planID          string
	storeID         string
	locationID      string
	productID       string
	priceCents      int
	subscriberLimit int
	startAt         time.Time
	durationMin     int
	cutoffHours     int
}

func ensureCycleAndOffering(ctx context.Context, tx pgx.Tx, in ensureCycleInput) (windowID string, offeringID string, err error) {
	startAt := in.startAt.UTC()
	endAt := startAt.Add(time.Duration(in.durationMin) * time.Minute)
	cutoffAt := startAt.Add(-time.Duration(in.cutoffHours) * time.Hour)

	// Create a pickup window first. If the cycle insert conflicts, we'll delete this window.
	var newWindowID string
	if err := tx.QueryRow(ctx, `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'published', $6)
		returning id::text
	`, in.storeID, in.locationID, startAt, endAt, cutoffAt, "Subscription box drop").Scan(&newWindowID); err != nil {
		return "", "", err
	}

	var cycleWindowID string
	err = tx.QueryRow(ctx, `
		insert into subscription_cycles (plan_id, store_id, pickup_window_id, start_at)
		values ($1::uuid, $2::uuid, $3::uuid, $4)
		on conflict (plan_id, start_at) do nothing
		returning pickup_window_id::text
	`, in.planID, in.storeID, newWindowID, startAt).Scan(&cycleWindowID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Conflict: use existing cycle window and delete our unused pickup window.
			if _, derr := tx.Exec(ctx, `delete from pickup_windows where id = $1::uuid`, newWindowID); derr != nil {
				return "", "", derr
			}
			if err := tx.QueryRow(ctx, `
				select pickup_window_id::text
				from subscription_cycles
				where plan_id = $1::uuid and start_at = $2
				limit 1
			`, in.planID, startAt).Scan(&cycleWindowID); err != nil {
				return "", "", err
			}
		} else {
			return "", "", err
		}
	}
	if cycleWindowID == "" {
		// If we inserted and returned nothing (shouldn't happen), fall back to newWindowID.
		cycleWindowID = newWindowID
	}

	// Ensure there's an offering for the plan's product at this pickup window.
	if err := tx.QueryRow(ctx, `
		select id::text
		from offerings
		where store_id = $1::uuid and pickup_window_id = $2::uuid and product_id = $3::uuid
		limit 1
	`, in.storeID, cycleWindowID, in.productID).Scan(&offeringID); err != nil {
		if err != pgx.ErrNoRows {
			return "", "", err
		}
		if err := tx.QueryRow(ctx, `
			insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
			values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, 'active')
			returning id::text
		`, in.storeID, cycleWindowID, in.productID, in.priceCents, in.subscriberLimit).Scan(&offeringID); err != nil {
			return "", "", err
		}
	}

	return cycleWindowID, offeringID, nil
}

type createOrderForOfferingInput struct {
	storeID        string
	pickupWindowID string
	offeringID     string
	subscriptionID *string
	buyerEmail     string
	buyerName      *string
	buyerPhone     *string
	quantity       int
	paymentMethod  string
	paymentStatus  string
	// Optional: set when payment_method == "card".
	stripePaymentIntentID *string
	buyerFeeBps           int
	buyerFeeFlatCts       int
}

func createOrderForOffering(ctx context.Context, tx pgx.Tx, in createOrderForOfferingInput) (Order, error) {
	if in.quantity <= 0 {
		return Order{}, errors.New("invalid quantity")
	}

	// Lock offering row and reserve inventory.
	var (
		priceCents   int
		qtyAvail     int
		qtyReserved  int
		productTitle string
		productUnit  string
	)
	if err := tx.QueryRow(ctx, `
		select
			o.price_cents,
			o.quantity_available,
			o.quantity_reserved,
			p.title,
			p.unit
		from offerings o
		join products p on p.id = o.product_id
		where o.id = $1::uuid
			and o.pickup_window_id = $2::uuid
			and o.store_id = $3::uuid
			and o.status = 'active'
		for update
	`, in.offeringID, in.pickupWindowID, in.storeID).Scan(
		&priceCents,
		&qtyAvail,
		&qtyReserved,
		&productTitle,
		&productUnit,
	); err != nil {
		return Order{}, err
	}

	remain := qtyAvail - qtyReserved
	if remain < in.quantity {
		return Order{}, errInsufficientInventory
	}
	if _, err := tx.Exec(ctx, `
		update offerings
		set quantity_reserved = quantity_reserved + $2
		where id = $1::uuid
	`, in.offeringID, in.quantity); err != nil {
		return Order{}, err
	}

	subtotal := priceCents * in.quantity
	buyerFee, total := computeBuyerFee(subtotal, in.buyerFeeBps, in.buyerFeeFlatCts)

	var out Order
	out.StoreID = in.storeID
	out.PickupWindowID = in.pickupWindowID
	out.BuyerEmail = in.buyerEmail
	out.BuyerName = in.buyerName
	out.BuyerPhone = in.buyerPhone
	out.SubtotalCents = subtotal
	out.BuyerFeeCents = buyerFee
	out.TotalCents = total

	paymentMethod := strings.TrimSpace(in.paymentMethod)
	if paymentMethod == "" {
		paymentMethod = "pay_at_pickup"
	}
	paymentStatus := strings.TrimSpace(in.paymentStatus)
	if paymentStatus == "" {
		paymentStatus = "unpaid"
	}

	var subID any = nil
	if in.subscriptionID != nil {
		subID = *in.subscriptionID
	}
	var stripePI any = nil
	if in.stripePaymentIntentID != nil && *in.stripePaymentIntentID != "" {
		stripePI = *in.stripePaymentIntentID
	}

	if err := tx.QueryRow(ctx, `
		insert into orders (
			store_id, pickup_window_id, buyer_email, buyer_name, buyer_phone,
			status, payment_method, payment_status,
			subtotal_cents, buyer_fee_cents, total_cents,
			subscription_id,
			stripe_payment_intent_id
		)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'placed', $6, $7, $8, $9, $10, $11::uuid, $12)
		returning id::text, buyer_token, pickup_code, status, payment_method, payment_status, captured_cents, created_at
	`, in.storeID, in.pickupWindowID, in.buyerEmail, in.buyerName, in.buyerPhone, paymentMethod, paymentStatus, subtotal, buyerFee, total, subID, stripePI).Scan(
		&out.ID,
		&out.BuyerToken,
		&out.PickupCode,
		&out.Status,
		&out.PaymentMethod,
		&out.PaymentStatus,
		&out.CapturedCents,
		&out.CreatedAt,
	); err != nil {
		return Order{}, err
	}

	line := priceCents * in.quantity
	var itemID string
	if err := tx.QueryRow(ctx, `
		insert into order_items (order_id, offering_id, product_title, product_unit, price_cents, quantity, line_total_cents)
		values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		returning id::text
	`, out.ID, in.offeringID, productTitle, productUnit, priceCents, in.quantity, line).Scan(&itemID); err != nil {
		return Order{}, err
	}

	oid := in.offeringID
	out.Items = []OrderItem{
		{
			ID:             itemID,
			OfferingID:     &oid,
			ProductTitle:   productTitle,
			ProductUnit:    productUnit,
			PriceCents:     priceCents,
			Quantity:       in.quantity,
			LineTotalCents: line,
		},
	}

	return out, nil
}
