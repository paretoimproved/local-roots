package v1

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
	"github.com/paretoimproved/local-roots/backend/internal/timeutil"
)

type SellerAPI struct {
	DB *pgxpool.Pool
}

type SellerStore struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Phone       *string   `json:"phone"`
	ImageURL    *string   `json:"image_url,omitempty"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a SellerAPI) ListMyStores(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select id::text, name, description, phone, image_url, is_active, created_at, updated_at
		from stores
		where owner_user_id = $1::uuid
		order by created_at desc
		limit 20
	`, u.ID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerStore, 0)
	for rows.Next() {
		var s SellerStore
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Phone, &s.ImageURL, &s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, s)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type createStoreRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Phone       *string `json:"phone"`
}

func (a SellerAPI) CreateStore(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return
	}

	var in createStoreRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if in.Name == "" {
		resp.BadRequest(w, "name is required")
		return
	}

	var out SellerStore
	err := a.DB.QueryRow(r.Context(), `
		insert into stores (owner_user_id, name, description, phone, is_active)
		values ($1::uuid, $2, $3, $4, true)
		returning id::text, name, description, phone, image_url, is_active, created_at, updated_at
	`, u.ID, in.Name, in.Description, in.Phone).Scan(
		&out.ID, &out.Name, &out.Description, &out.Phone, &out.ImageURL, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		// Likely unique owner_user_id violation (one store per seller in current schema).
		if pgxErr, ok := err.(*pgconn.PgError); ok && pgxErr.Code == "23505" {
			resp.BadRequest(w, "store already exists for this seller")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

type updateStoreRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Phone       *string `json:"phone"`
	IsActive    *bool   `json:"is_active"`
	ImageURL    *string `json:"image_url"`
}

func (a SellerAPI) DeleteStore(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	ctx := r.Context()

	var activeSubs int
	if err := a.DB.QueryRow(ctx, `
		select count(1) from subscriptions where store_id = $1::uuid and status = 'active'
	`, sc.StoreID).Scan(&activeSubs); err != nil {
		resp.Internal(w, err)
		return
	}
	if activeSubs > 0 {
		resp.BadRequest(w, fmt.Sprintf("Cannot delete: you have %d active subscriber(s). Cancel all subscriptions first.", activeSubs))
		return
	}

	var unfulfilledOrders int
	if err := a.DB.QueryRow(ctx, `
		select count(1) from orders where store_id = $1::uuid and status in ('placed', 'ready')
	`, sc.StoreID).Scan(&unfulfilledOrders); err != nil {
		resp.Internal(w, err)
		return
	}
	if unfulfilledOrders > 0 {
		resp.BadRequest(w, fmt.Sprintf("Cannot delete: you have %d unfulfilled order(s). Complete or cancel them first.", unfulfilledOrders))
		return
	}

	tag, err := a.DB.Exec(ctx, `
		delete from stores where id = $1::uuid and owner_user_id = $2::uuid
	`, sc.StoreID, u.ID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		resp.NotFound(w, "store not found")
		return
	}

	resp.OK(w, map[string]bool{"deleted": true})
}

func (a SellerAPI) UpdateStore(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in updateStoreRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	var out SellerStore
	err := a.DB.QueryRow(r.Context(), `
		update stores
		set
			name = coalesce($2, name),
			description = coalesce($3, description),
			phone = coalesce($4, phone),
			is_active = coalesce($5, is_active),
			image_url = CASE WHEN $6 = '' THEN NULL WHEN $6 IS NOT NULL THEN $6 ELSE image_url END,
			updated_at = now()
		where id = $1::uuid
		returning id::text, name, description, phone, image_url, is_active, created_at, updated_at
	`, sc.StoreID, in.Name, in.Description, in.Phone, in.IsActive, in.ImageURL).Scan(
		&out.ID, &out.Name, &out.Description, &out.Phone, &out.ImageURL, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

type SellerPickupLocation struct {
	ID         string  `json:"id"`
	Label      *string `json:"label"`
	Address1   string  `json:"address1"`
	Address2   *string `json:"address2"`
	City       string  `json:"city"`
	Region     string  `json:"region"`
	PostalCode string  `json:"postal_code"`
	Country    string  `json:"country"`
	Timezone   string  `json:"timezone"`
	PhotoURL   *string `json:"photo_url,omitempty"`
}

func (a SellerAPI) ListPickupLocations(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	rows, err := a.DB.Query(r.Context(), `
		select id::text, label, address1, address2, city, region, postal_code, country, timezone, photo_url
		from pickup_locations
		where store_id = $1::uuid
		order by created_at desc
		limit 50
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerPickupLocation, 0)
	for rows.Next() {
		var pl SellerPickupLocation
		if err := rows.Scan(&pl.ID, &pl.Label, &pl.Address1, &pl.Address2, &pl.City, &pl.Region, &pl.PostalCode, &pl.Country, &pl.Timezone, &pl.PhotoURL); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, pl)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type createPickupLocationRequest struct {
	Label      *string  `json:"label"`
	Address1   string   `json:"address1"`
	Address2   *string  `json:"address2"`
	City       string   `json:"city"`
	Region     string   `json:"region"`
	PostalCode string   `json:"postal_code"`
	Country    *string  `json:"country"`
	Timezone   string   `json:"timezone"`
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
}

func (a SellerAPI) CreatePickupLocation(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in createPickupLocationRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	in.Address1 = strings.TrimSpace(in.Address1)
	in.City = strings.TrimSpace(in.City)
	in.Region = strings.TrimSpace(in.Region)
	in.PostalCode = strings.TrimSpace(in.PostalCode)
	in.Timezone = strings.TrimSpace(in.Timezone)
	if in.Address1 == "" || in.City == "" || in.Region == "" || in.PostalCode == "" || in.Timezone == "" {
		resp.BadRequest(w, "address1, city, region, postal_code, timezone are required")
		return
	}
	_, normalizedTZ, err := timeutil.LoadLocationBestEffort(in.Timezone)
	if err != nil {
		resp.BadRequest(w, "invalid timezone")
		return
	}
	country := "US"
	if in.Country != nil && strings.TrimSpace(*in.Country) != "" {
		country = strings.TrimSpace(*in.Country)
	}

	var out SellerPickupLocation
	err = a.DB.QueryRow(r.Context(), `
		insert into pickup_locations (store_id, label, address1, address2, city, region, postal_code, country, timezone, lat, lng)
		values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		returning id::text, label, address1, address2, city, region, postal_code, country, timezone
	`, sc.StoreID, in.Label, in.Address1, in.Address2, in.City, in.Region, in.PostalCode, country, normalizedTZ, in.Lat, in.Lng).Scan(
		&out.ID, &out.Label, &out.Address1, &out.Address2, &out.City, &out.Region, &out.PostalCode, &out.Country, &out.Timezone,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	resp.OK(w, out)
}

func (a SellerAPI) DeletePickupLocation(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	locationID := r.PathValue("pickupLocationId")
	if locationID == "" {
		resp.BadRequest(w, "missing pickupLocationId")
		return
	}

	// Confirm the pickup location belongs to this store.
	var exists int
	if err := a.DB.QueryRow(r.Context(), `
		select 1
		from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
		limit 1
	`, locationID, sc.StoreID).Scan(&exists); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup location not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	// Safety guard: do not allow deletion once the location is used by plans/windows.
	var planCount int
	if err := a.DB.QueryRow(r.Context(), `
		select count(1)
		from subscription_plans
		where store_id = $1::uuid and pickup_location_id = $2::uuid
	`, sc.StoreID, locationID).Scan(&planCount); err != nil {
		resp.Internal(w, err)
		return
	}
	if planCount > 0 {
		resp.BadRequest(w, "pickup location is in use by a box plan and cannot be deleted")
		return
	}

	var windowCount int
	if err := a.DB.QueryRow(r.Context(), `
		select count(1)
		from pickup_windows
		where store_id = $1::uuid and pickup_location_id = $2::uuid
	`, sc.StoreID, locationID).Scan(&windowCount); err != nil {
		resp.Internal(w, err)
		return
	}
	if windowCount > 0 {
		resp.BadRequest(w, "pickup location is in use by a pickup window and cannot be deleted")
		return
	}

	tag, err := a.DB.Exec(r.Context(), `
		delete from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
	`, locationID, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		resp.NotFound(w, "pickup location not found")
		return
	}

	resp.OK(w, map[string]bool{"deleted": true})
}

type updatePickupLocationRequest struct {
	Label      *string  `json:"label"`
	Address1   *string  `json:"address1"`
	Address2   *string  `json:"address2"`
	City       *string  `json:"city"`
	Region     *string  `json:"region"`
	PostalCode *string  `json:"postal_code"`
	Country    *string  `json:"country"`
	Timezone   *string  `json:"timezone"`
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
	PhotoURL   *string  `json:"photo_url"`
}

func (a SellerAPI) UpdatePickupLocation(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	locationID := r.PathValue("pickupLocationId")
	if locationID == "" {
		resp.BadRequest(w, "missing pickupLocationId")
		return
	}

	var in updatePickupLocationRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	// If timezone is provided and non-empty, validate and normalize it.
	var normalizedTZ *string
	if in.Timezone != nil && strings.TrimSpace(*in.Timezone) != "" {
		_, tz, err := timeutil.LoadLocationBestEffort(*in.Timezone)
		if err != nil {
			resp.BadRequest(w, "invalid timezone")
			return
		}
		normalizedTZ = &tz
	}

	var out SellerPickupLocation
	err := a.DB.QueryRow(r.Context(), `
		update pickup_locations
		set
			label = coalesce($3, label),
			address1 = coalesce($4, address1),
			address2 = coalesce($5, address2),
			city = coalesce($6, city),
			region = coalesce($7, region),
			postal_code = coalesce($8, postal_code),
			country = coalesce($9, country),
			timezone = coalesce($10, timezone),
			lat = coalesce($11, lat),
			lng = coalesce($12, lng),
			photo_url = CASE WHEN $13 = '' THEN NULL WHEN $13 IS NOT NULL THEN $13 ELSE photo_url END,
			updated_at = now()
		where id = $1::uuid and store_id = $2::uuid
		returning id::text, label, address1, address2, city, region, postal_code, country, timezone, photo_url
	`, locationID, sc.StoreID, in.Label, in.Address1, in.Address2, in.City, in.Region, in.PostalCode, in.Country, normalizedTZ, in.Lat, in.Lng, in.PhotoURL).Scan(
		&out.ID, &out.Label, &out.Address1, &out.Address2, &out.City, &out.Region, &out.PostalCode, &out.Country, &out.Timezone, &out.PhotoURL,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup location not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

type SellerPickupWindow struct {
	ID             string               `json:"id"`
	StartAt        time.Time            `json:"start_at"`
	EndAt          time.Time            `json:"end_at"`
	CutoffAt       time.Time            `json:"cutoff_at"`
	Status         string               `json:"status"`
	Notes          *string              `json:"notes"`
	PickupLocation SellerPickupLocation `json:"pickup_location"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
}

type createPickupWindowRequest struct {
	PickupLocationID string    `json:"pickup_location_id"`
	StartAt          time.Time `json:"start_at"`
	EndAt            time.Time `json:"end_at"`
	CutoffAt         time.Time `json:"cutoff_at"`
	Status           *string   `json:"status"`
	Notes            *string   `json:"notes"`
}

func (a SellerAPI) ListPickupWindows(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	rows, err := a.DB.Query(r.Context(), `
		select
			pw.id::text,
			pw.start_at,
			pw.end_at,
			pw.cutoff_at,
			pw.status,
			pw.notes,
			pw.created_at,
			pw.updated_at,
			pl.id::text,
			pl.label,
			pl.address1,
			pl.address2,
			pl.city,
			pl.region,
			pl.postal_code,
			pl.country,
			pl.timezone
		from pickup_windows pw
		join pickup_locations pl on pl.id = pw.pickup_location_id
		where pw.store_id = $1::uuid
		order by pw.start_at desc
		limit 100
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerPickupWindow, 0)
	for rows.Next() {
		var pw SellerPickupWindow
		if err := rows.Scan(
			&pw.ID,
			&pw.StartAt,
			&pw.EndAt,
			&pw.CutoffAt,
			&pw.Status,
			&pw.Notes,
			&pw.CreatedAt,
			&pw.UpdatedAt,
			&pw.PickupLocation.ID,
			&pw.PickupLocation.Label,
			&pw.PickupLocation.Address1,
			&pw.PickupLocation.Address2,
			&pw.PickupLocation.City,
			&pw.PickupLocation.Region,
			&pw.PickupLocation.PostalCode,
			&pw.PickupLocation.Country,
			&pw.PickupLocation.Timezone,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, pw)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

func (a SellerAPI) CreatePickupWindow(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in createPickupWindowRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	if strings.TrimSpace(in.PickupLocationID) == "" {
		resp.BadRequest(w, "pickup_location_id is required")
		return
	}
	if in.StartAt.IsZero() || in.EndAt.IsZero() || in.CutoffAt.IsZero() {
		resp.BadRequest(w, "start_at, end_at, cutoff_at are required")
		return
	}
	status := "draft"
	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		status = strings.TrimSpace(*in.Status)
	}

	var out SellerPickupWindow
	err := a.DB.QueryRow(r.Context(), `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		returning id::text, start_at, end_at, cutoff_at, status, notes, created_at, updated_at
	`, sc.StoreID, in.PickupLocationID, in.StartAt, in.EndAt, in.CutoffAt, status, in.Notes).Scan(
		&out.ID, &out.StartAt, &out.EndAt, &out.CutoffAt, &out.Status, &out.Notes, &out.CreatedAt, &out.UpdatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Attach pickup location (for convenience).
	if err := a.DB.QueryRow(r.Context(), `
		select id::text, label, address1, address2, city, region, postal_code, country, timezone
		from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
	`, in.PickupLocationID, sc.StoreID).Scan(
		&out.PickupLocation.ID,
		&out.PickupLocation.Label,
		&out.PickupLocation.Address1,
		&out.PickupLocation.Address2,
		&out.PickupLocation.City,
		&out.PickupLocation.Region,
		&out.PickupLocation.PostalCode,
		&out.PickupLocation.Country,
		&out.PickupLocation.Timezone,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

type SellerProduct struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	Description  *string `json:"description"`
	Unit         string  `json:"unit"`
	IsPerishable bool    `json:"is_perishable"`
	IsActive     bool    `json:"is_active"`
}

type createProductRequest struct {
	Title        string  `json:"title"`
	Description  *string `json:"description"`
	Unit         string  `json:"unit"`
	IsPerishable *bool   `json:"is_perishable"`
	IsActive     *bool   `json:"is_active"`
}

func (a SellerAPI) ListProducts(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	rows, err := a.DB.Query(r.Context(), `
		select id::text, title, description, unit, is_perishable, is_active
		from products
		where store_id = $1::uuid
		order by created_at desc
		limit 200
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerProduct, 0)
	for rows.Next() {
		var p SellerProduct
		if err := rows.Scan(&p.ID, &p.Title, &p.Description, &p.Unit, &p.IsPerishable, &p.IsActive); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, p)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}
	resp.OK(w, out)
}

func (a SellerAPI) CreateProduct(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	var in createProductRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Unit = strings.TrimSpace(in.Unit)
	if in.Title == "" || in.Unit == "" {
		resp.BadRequest(w, "title and unit are required")
		return
	}
	isPerishable := true
	if in.IsPerishable != nil {
		isPerishable = *in.IsPerishable
	}
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	var out SellerProduct
	err := a.DB.QueryRow(r.Context(), `
		insert into products (store_id, title, description, unit, is_perishable, is_active)
		values ($1::uuid, $2, $3, $4, $5, $6)
		returning id::text, title, description, unit, is_perishable, is_active
	`, sc.StoreID, in.Title, in.Description, in.Unit, isPerishable, isActive).Scan(
		&out.ID, &out.Title, &out.Description, &out.Unit, &out.IsPerishable, &out.IsActive,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	resp.OK(w, out)
}

type SellerOffering struct {
	ID                string        `json:"id"`
	PickupWindowID    string        `json:"pickup_window_id"`
	ProductID         string        `json:"product_id"`
	PriceCents        int           `json:"price_cents"`
	QuantityAvailable int           `json:"quantity_available"`
	QuantityReserved  int           `json:"quantity_reserved"`
	Status            string        `json:"status"`
	Product           SellerProduct `json:"product"`
}

type createOfferingRequest struct {
	ProductID         string  `json:"product_id"`
	PriceCents        int     `json:"price_cents"`
	QuantityAvailable int     `json:"quantity_available"`
	Status            *string `json:"status"`
}

func (a SellerAPI) ListOfferings(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select
			o.id::text,
			o.pickup_window_id::text,
			o.product_id::text,
			o.price_cents,
			o.quantity_available,
			o.quantity_reserved,
			o.status,
			p.id::text,
			p.title,
			p.description,
			p.unit,
			p.is_perishable,
			p.is_active
		from offerings o
		join products p on p.id = o.product_id
		where o.store_id = $1::uuid
			and o.pickup_window_id = $2::uuid
		order by p.title asc
		limit 100
	`, sc.StoreID, windowID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerOffering, 0)
	for rows.Next() {
		var o SellerOffering
		if err := rows.Scan(
			&o.ID,
			&o.PickupWindowID,
			&o.ProductID,
			&o.PriceCents,
			&o.QuantityAvailable,
			&o.QuantityReserved,
			&o.Status,
			&o.Product.ID,
			&o.Product.Title,
			&o.Product.Description,
			&o.Product.Unit,
			&o.Product.IsPerishable,
			&o.Product.IsActive,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, o)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

func (a SellerAPI) CreateOffering(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var in createOfferingRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	if strings.TrimSpace(in.ProductID) == "" {
		resp.BadRequest(w, "product_id is required")
		return
	}
	if in.PriceCents < 0 || in.QuantityAvailable < 0 {
		resp.BadRequest(w, "price_cents and quantity_available must be >= 0")
		return
	}
	status := "active"
	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		status = strings.TrimSpace(*in.Status)
	}

	var out SellerOffering
	err := a.DB.QueryRow(r.Context(), `
		insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, $6)
		returning id::text, pickup_window_id::text, product_id::text, price_cents, quantity_available, quantity_reserved, status
	`, sc.StoreID, windowID, in.ProductID, in.PriceCents, in.QuantityAvailable, status).Scan(
		&out.ID,
		&out.PickupWindowID,
		&out.ProductID,
		&out.PriceCents,
		&out.QuantityAvailable,
		&out.QuantityReserved,
		&out.Status,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	if err := a.DB.QueryRow(r.Context(), `
		select id::text, title, description, unit, is_perishable, is_active
		from products
		where id = $1::uuid and store_id = $2::uuid
	`, out.ProductID, sc.StoreID).Scan(
		&out.Product.ID,
		&out.Product.Title,
		&out.Product.Description,
		&out.Product.Unit,
		&out.Product.IsPerishable,
		&out.Product.IsActive,
	); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, out)
}

// ── Subscriptions (seller view) ──────────────────────────────────────

type SellerSubscription struct {
	ID         string    `json:"id"`
	PlanID     string    `json:"plan_id"`
	PlanTitle  string    `json:"plan_title"`
	BuyerEmail string    `json:"buyer_email"`
	BuyerName  *string   `json:"buyer_name"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
}

func (a SellerAPI) ListSubscriptions(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	rows, err := a.DB.Query(r.Context(), `
		SELECT s.id::text, s.plan_id::text, sp.title, s.buyer_email, s.buyer_name, s.status, s.created_at
		FROM subscriptions s
		JOIN subscription_plans sp ON sp.id = s.plan_id
		WHERE s.store_id = $1::uuid
		ORDER BY s.created_at DESC
		LIMIT 200
	`, sc.StoreID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerSubscription, 0)
	for rows.Next() {
		var s SellerSubscription
		if err := rows.Scan(&s.ID, &s.PlanID, &s.PlanTitle, &s.BuyerEmail, &s.BuyerName, &s.Status, &s.CreatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, s)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

func (a SellerAPI) CancelSubscription(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	subID := r.PathValue("subscriptionId")
	if subID == "" || !validUUID(subID) {
		resp.BadRequest(w, "invalid subscription id")
		return
	}

	ctx := r.Context()
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer tx.Rollback(ctx)

	// Verify the subscription belongs to this store and is cancelable.
	var currentStatus string
	err = tx.QueryRow(ctx, `
		SELECT status FROM subscriptions
		WHERE id = $1::uuid AND store_id = $2::uuid
		FOR UPDATE
	`, subID, sc.StoreID).Scan(&currentStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "subscription not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if currentStatus != "active" && currentStatus != "paused" {
		resp.BadRequest(w, fmt.Sprintf("subscription is already %s", currentStatus))
		return
	}

	// Cancel the subscription.
	if _, err := tx.Exec(ctx, `
		UPDATE subscriptions
		SET status = 'canceled', canceled_at = now(), cancel_reason = 'canceled_by_seller'
		WHERE id = $1::uuid
	`, subID); err != nil {
		resp.Internal(w, err)
		return
	}

	// Find unfulfilled orders for this subscription.
	orderRows, err := tx.Query(ctx, `
		SELECT id::text FROM orders
		WHERE subscription_id = $1::uuid AND status IN ('placed', 'ready')
	`, subID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer orderRows.Close()

	var orderIDs []string
	for orderRows.Next() {
		var oid string
		if err := orderRows.Scan(&oid); err != nil {
			resp.Internal(w, err)
			return
		}
		orderIDs = append(orderIDs, oid)
	}
	if orderRows.Err() != nil {
		resp.Internal(w, orderRows.Err())
		return
	}

	// Cancel each unfulfilled order and release inventory.
	for _, oid := range orderIDs {
		if err := adjustOfferingsForOrder(ctx, tx, oid, "release"); err != nil {
			log.Printf("WARN: adjustOfferingsForOrder(%s, release): %v", oid, err)
		}
		if _, err := tx.Exec(ctx, `
			UPDATE orders SET status = 'canceled', updated_at = now()
			WHERE id = $1::uuid
		`, oid); err != nil {
			resp.Internal(w, err)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]bool{"canceled": true})
}
