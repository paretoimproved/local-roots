package v1

import (
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

func (a SellerAPI) requireSeller(u AuthUser, w http.ResponseWriter) bool {
	if u.Role != "seller" && u.Role != "admin" {
		resp.Forbidden(w, "seller access required")
		return false
	}
	return true
}

type SellerStore struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Phone       *string   `json:"phone"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (a SellerAPI) ListMyStores(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select id::text, name, description, phone, is_active, created_at, updated_at
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
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Phone, &s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
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
	if !a.requireSeller(u, w) {
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
		returning id::text, name, description, phone, is_active, created_at, updated_at
	`, u.ID, in.Name, in.Description, in.Phone).Scan(
		&out.ID, &out.Name, &out.Description, &out.Phone, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
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
}

func (a SellerAPI) UpdateStore(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

	var in updateStoreRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
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

	var out SellerStore
	err := a.DB.QueryRow(r.Context(), `
		update stores
		set
			name = coalesce($2, name),
			description = coalesce($3, description),
			phone = coalesce($4, phone),
			is_active = coalesce($5, is_active),
			updated_at = now()
		where id = $1::uuid
		returning id::text, name, description, phone, is_active, created_at, updated_at
	`, storeID, in.Name, in.Description, in.Phone, in.IsActive).Scan(
		&out.ID, &out.Name, &out.Description, &out.Phone, &out.IsActive, &out.CreatedAt, &out.UpdatedAt,
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
}

func (a SellerAPI) ListPickupLocations(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
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
		select id::text, label, address1, address2, city, region, postal_code, country, timezone
		from pickup_locations
		where store_id = $1::uuid
		order by created_at desc
		limit 50
	`, storeID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]SellerPickupLocation, 0)
	for rows.Next() {
		var pl SellerPickupLocation
		if err := rows.Scan(&pl.ID, &pl.Label, &pl.Address1, &pl.Address2, &pl.City, &pl.Region, &pl.PostalCode, &pl.Country, &pl.Timezone); err != nil {
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
	Label      *string `json:"label"`
	Address1   string  `json:"address1"`
	Address2   *string `json:"address2"`
	City       string  `json:"city"`
	Region     string  `json:"region"`
	PostalCode string  `json:"postal_code"`
	Country    *string `json:"country"`
	Timezone   string  `json:"timezone"`
}

func (a SellerAPI) CreatePickupLocation(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

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

	var out SellerPickupLocation
	err = a.DB.QueryRow(r.Context(), `
		insert into pickup_locations (store_id, label, address1, address2, city, region, postal_code, country, timezone)
		values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)
		returning id::text, label, address1, address2, city, region, postal_code, country, timezone
	`, storeID, in.Label, in.Address1, in.Address2, in.City, in.Region, in.PostalCode, country, normalizedTZ).Scan(
		&out.ID, &out.Label, &out.Address1, &out.Address2, &out.City, &out.Region, &out.PostalCode, &out.Country, &out.Timezone,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	resp.OK(w, out)
}

func (a SellerAPI) DeletePickupLocation(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}
	locationID := r.PathValue("pickupLocationId")
	if locationID == "" {
		resp.BadRequest(w, "missing pickupLocationId")
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

	// Confirm the pickup location belongs to this store.
	var exists int
	if err := a.DB.QueryRow(r.Context(), `
		select 1
		from pickup_locations
		where id = $1::uuid and store_id = $2::uuid
		limit 1
	`, locationID, storeID).Scan(&exists); err != nil {
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
	`, storeID, locationID).Scan(&planCount); err != nil {
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
	`, storeID, locationID).Scan(&windowCount); err != nil {
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
	`, locationID, storeID)
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

func (a SellerAPI) ListPickupWindows(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
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
	`, storeID)
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

func (a SellerAPI) CreatePickupWindow(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

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

	var out SellerPickupWindow
	err := a.DB.QueryRow(r.Context(), `
		insert into pickup_windows (store_id, pickup_location_id, start_at, end_at, cutoff_at, status, notes)
		values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
		returning id::text, start_at, end_at, cutoff_at, status, notes, created_at, updated_at
	`, storeID, in.PickupLocationID, in.StartAt, in.EndAt, in.CutoffAt, status, in.Notes).Scan(
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
	`, in.PickupLocationID, storeID).Scan(
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

func (a SellerAPI) ListProducts(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
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
		select id::text, title, description, unit, is_perishable, is_active
		from products
		where store_id = $1::uuid
		order by created_at desc
		limit 200
	`, storeID)
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

func (a SellerAPI) CreateProduct(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

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

	var out SellerProduct
	err := a.DB.QueryRow(r.Context(), `
		insert into products (store_id, title, description, unit, is_perishable, is_active)
		values ($1::uuid, $2, $3, $4, $5, $6)
		returning id::text, title, description, unit, is_perishable, is_active
	`, storeID, in.Title, in.Description, in.Unit, isPerishable, isActive).Scan(
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

func (a SellerAPI) ListOfferings(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
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
		limit 500
	`, storeID, windowID)
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

func (a SellerAPI) CreateOffering(w http.ResponseWriter, r *http.Request, u AuthUser) {
	if !a.requireSeller(u, w) {
		return
	}
	storeID := r.PathValue("storeId")
	windowID := r.PathValue("pickupWindowId")
	if storeID == "" || windowID == "" {
		resp.BadRequest(w, "missing storeId or pickupWindowId")
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

	var out SellerOffering
	err := a.DB.QueryRow(r.Context(), `
		insert into offerings (store_id, pickup_window_id, product_id, price_cents, quantity_available, quantity_reserved, status)
		values ($1::uuid, $2::uuid, $3::uuid, $4, $5, 0, $6)
		returning id::text, pickup_window_id::text, product_id::text, price_cents, quantity_available, quantity_reserved, status
	`, storeID, windowID, in.ProductID, in.PriceCents, in.QuantityAvailable, status).Scan(
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
	`, out.ProductID, storeID).Scan(
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
