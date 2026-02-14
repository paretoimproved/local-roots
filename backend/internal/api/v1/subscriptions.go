package v1

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SubscriptionAPI struct {
	DB *pgxpool.Pool
}

type SellerSubscriptionAPI struct {
	DB *pgxpool.Pool
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
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
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
	if planID == "" {
		resp.BadRequest(w, "missing planId")
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

type SubscribeRequest struct {
	Buyer struct {
		Email string  `json:"email"`
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	} `json:"buyer"`
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

func (a SubscriptionAPI) Subscribe(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	planID := r.PathValue("planId")
	if planID == "" {
		resp.BadRequest(w, "missing planId")
		return
	}

	var in SubscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	buyerEmail := strings.ToLower(strings.TrimSpace(in.Buyer.Email))
	if buyerEmail == "" || !strings.Contains(buyerEmail, "@") {
		resp.BadRequest(w, "invalid buyer email")
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
		resp.BadRequest(w, "this box is currently full")
		return
	}

	var sub Subscription
	err = tx.QueryRow(ctx, `
		insert into subscriptions (plan_id, store_id, buyer_email, buyer_name, buyer_phone, status)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'active')
		returning id::text, plan_id::text, store_id::text, buyer_token, status, created_at
	`, planID, storeID, buyerEmail, in.Buyer.Name, in.Buyer.Phone).Scan(
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
		storeID:        storeID,
		pickupWindowID: windowID,
		offeringID:     offeringID,
		subscriptionID: &sub.ID,
		buyerEmail:     buyerEmail,
		buyerName:      in.Buyer.Name,
		buyerPhone:     in.Buyer.Phone,
		quantity:       1,
	})
	if err != nil {
		if errors.Is(err, errInsufficientInventory) {
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

func (a SellerSubscriptionAPI) ListPlans(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
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
	`, storeID)
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

func (a SellerSubscriptionAPI) CreatePlan(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

	var in CreatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
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

	// Ensure location belongs to store and get timezone.
	var locTimezone string
	if err := a.DB.QueryRow(r.Context(), `
		select timezone
		from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
		limit 1
	`, in.PickupLocationID, storeID).Scan(&locTimezone); err != nil {
		if err == pgx.ErrNoRows {
			resp.BadRequest(w, "pickup location not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	loc, err := time.LoadLocation(locTimezone)
	if err != nil {
		resp.BadRequest(w, "invalid pickup location timezone")
		return
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
	`, storeID, in.Title, in.Description, unit).Scan(&productID); err != nil {
		resp.Internal(w, err)
		return
	}

	var out SubscriptionPlanSeller
	out.PickupLocationID = in.PickupLocationID
	out.ProductID = productID
	out.StoreID = storeID
	out.Title = in.Title
	out.Description = in.Description
	out.Cadence = in.Cadence
	out.PriceCents = in.PriceCents
	out.SubscriberLimit = in.SubscriberLimit
	out.FirstStartAt = firstUTC
	out.DurationMin = in.DurationMinutes
	out.CutoffHours = in.CutoffHours
	out.IsActive = true

	if err := tx.QueryRow(ctx, `
		insert into subscription_plans (
			store_id, pickup_location_id, product_id, title, description, cadence, price_cents, subscriber_limit,
			first_start_at, duration_minutes, cutoff_hours, is_active
		)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, true)
		returning id::text, created_at, updated_at
	`, storeID, in.PickupLocationID, productID, in.Title, in.Description, in.Cadence, in.PriceCents, in.SubscriberLimit, firstUTC, in.DurationMinutes, in.CutoffHours).Scan(
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

func (a SellerSubscriptionAPI) GenerateNextCycle(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	storeID := r.PathValue("storeId")
	planID := r.PathValue("planId")
	if storeID == "" || planID == "" {
		resp.BadRequest(w, "missing storeId or planId")
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
	`, planID, storeID).Scan(
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

	windowID, offeringID, err := ensureCycleAndOffering(ctx, tx, ensureCycleInput{
		planID:          planID,
		storeID:         storeID,
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

	// Create orders for all active subscriptions that don't already have an order for this pickup window.
	rows, err := tx.Query(ctx, `
		select id::text, buyer_email, buyer_name, buyer_phone
		from subscriptions
		where plan_id = $1::uuid and status = 'active'
		order by created_at asc
		limit 5000
	`, planID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	created := 0
	for rows.Next() {
		var (
			subID string
			email string
			name  *string
			phone *string
		)
		if err := rows.Scan(&subID, &email, &name, &phone); err != nil {
			resp.Internal(w, err)
			return
		}

		var exists bool
		if err := tx.QueryRow(ctx, `
			select exists(select 1 from orders where subscription_id = $1::uuid and pickup_window_id = $2::uuid)
		`, subID, windowID).Scan(&exists); err != nil {
			resp.Internal(w, err)
			return
		}
		if exists {
			continue
		}

		if _, err := createOrderForOffering(ctx, tx, createOrderForOfferingInput{
			storeID:        storeID,
			pickupWindowID: windowID,
			offeringID:     offeringID,
			subscriptionID: &subID,
			buyerEmail:     email,
			buyerName:      name,
			buyerPhone:     phone,
			quantity:       1,
		}); err != nil {
			if errors.Is(err, errInsufficientInventory) {
				resp.BadRequest(w, "subscriber limit exceeded for this cycle")
				return
			}
			resp.Internal(w, err)
			return
		}
		created++
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
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
	total := subtotal

	var out Order
	out.StoreID = in.storeID
	out.PickupWindowID = in.pickupWindowID
	out.BuyerEmail = in.buyerEmail
	out.BuyerName = in.buyerName
	out.BuyerPhone = in.buyerPhone
	out.SubtotalCents = subtotal
	out.TotalCents = total

	// Create order. Payment method remains pay_at_pickup until Stripe Billing is added.
	var subID any = nil
	if in.subscriptionID != nil {
		subID = *in.subscriptionID
	}

	if err := tx.QueryRow(ctx, `
		insert into orders (store_id, pickup_window_id, buyer_email, buyer_name, buyer_phone, status, payment_method, payment_status, subtotal_cents, total_cents, subscription_id)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'placed', 'pay_at_pickup', 'unpaid', $6, $7, $8::uuid)
		returning id::text, buyer_token, pickup_code, status, payment_method, payment_status, created_at
	`, in.storeID, in.pickupWindowID, in.buyerEmail, in.buyerName, in.buyerPhone, subtotal, total, subID).Scan(
		&out.ID,
		&out.BuyerToken,
		&out.PickupCode,
		&out.Status,
		&out.PaymentMethod,
		&out.PaymentStatus,
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
