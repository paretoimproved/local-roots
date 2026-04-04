package v1

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type PublicAPI struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

type Store struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Description    *string    `json:"description"`
	ImageURL       *string    `json:"image_url,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	City           *string    `json:"city,omitempty"`
	Region         *string    `json:"region,omitempty"`
	DistanceKM     *float64   `json:"distance_km,omitempty"`
	IsDemo         bool       `json:"is_demo"`
	NextPickupDate *time.Time `json:"next_pickup_date,omitempty"`
}

func (a PublicAPI) GetStore(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

	var s Store
	err := a.DB.QueryRow(r.Context(), `
		select s.id::text, s.name, s.description, s.image_url, s.created_at,
			nearest.city, nearest.region, s.is_demo
		from stores s
		left join lateral (
			select pl.city, pl.region
			from pickup_locations pl
			where pl.store_id = s.id
			limit 1
		) nearest on true
		where s.id = $1::uuid
			and s.is_active = true
	`, storeID).Scan(&s.ID, &s.Name, &s.Description, &s.ImageURL, &s.CreatedAt, &s.City, &s.Region, &s.IsDemo)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "store not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, s)
}

func (a PublicAPI) ListStores(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	q := r.URL.Query()
	showDemo := q.Get("demo") == "true"

	// Only honour demo=true for authenticated admin users.
	if showDemo && a.JWTSecret != "" {
		allowed := false
		if hdr := r.Header.Get("Authorization"); strings.HasPrefix(hdr, "Bearer ") {
			tokenStr := strings.TrimPrefix(hdr, "Bearer ")
			if claims, err := auth.ParseJWT([]byte(a.JWTSecret), tokenStr); err == nil && claims.Role == "admin" {
				allowed = true
			}
		}
		if !allowed {
			showDemo = false
		}
	}

	latStr := q.Get("lat")
	lngStr := q.Get("lng")

	var hasGeo bool
	var lat, lng, radiusKM float64

	if latStr != "" && lngStr != "" {
		var err error
		lat, err = strconv.ParseFloat(latStr, 64)
		if err != nil || lat < -90 || lat > 90 {
			resp.BadRequest(w, "invalid lat")
			return
		}
		lng, err = strconv.ParseFloat(lngStr, 64)
		if err != nil || lng < -180 || lng > 180 {
			resp.BadRequest(w, "invalid lng")
			return
		}
		hasGeo = true

		radiusKM = 80
		if rStr := q.Get("radius_km"); rStr != "" {
			radiusKM, err = strconv.ParseFloat(rStr, 64)
			if err != nil || radiusKM <= 0 {
				resp.BadRequest(w, "invalid radius_km")
				return
			}
			if radiusKM > 200 {
				radiusKM = 200
			}
		}
	}

	var query string
	var args []any

	args = append(args, showDemo)

	if hasGeo {
		args = append(args, lat, lng, radiusKM)
		query = `
			with distances as (
				select distinct on (s.id)
					s.id::text, s.name, s.description, s.image_url, s.created_at,
					pl.city, pl.region,
					6371 * acos(
						cos(radians($2)) * cos(radians(pl.lat)) *
						cos(radians(pl.lng) - radians($3)) +
						sin(radians($2)) * sin(radians(pl.lat))
					) as distance_km,
					s.is_demo,
					s.id as store_id_raw
				from stores s
				join pickup_locations pl on pl.store_id = s.id
				where s.is_active = true
					and ($1 = false or s.is_demo = true)
					and exists (
						select 1 from subscription_plans sp
						where sp.store_id = s.id
							and sp.is_active = true
							and sp.is_live = true
					)
				order by s.id, distance_km asc
			)
			select
				d.id, d.name, d.description, d.image_url, d.created_at,
				d.city, d.region, d.distance_km, d.is_demo,
				npw.start_at
			from distances d
			left join lateral (
				select start_at from pickup_windows
				where pickup_windows.store_id = d.store_id_raw
					and status = 'published'
					and start_at > now()
				order by start_at limit 1
			) npw on true
			where d.distance_km <= $4
			order by d.distance_km asc
			limit 100
		`
	} else {
		query = `
			select s.id::text, s.name, s.description, s.image_url, s.created_at,
				nearest.city, nearest.region, s.is_demo,
				npw.start_at
			from stores s
			left join lateral (
				select pl.city, pl.region
				from pickup_locations pl
				where pl.store_id = s.id
				limit 1
			) nearest on true
			left join lateral (
				select start_at from pickup_windows
				where pickup_windows.store_id = s.id
					and status = 'published'
					and start_at > now()
				order by start_at limit 1
			) npw on true
			where s.is_active = true
				and ($1 = false or s.is_demo = true)
				and exists (
					select 1 from subscription_plans sp
					where sp.store_id = s.id
						and sp.is_active = true
						and sp.is_live = true
				)
			order by s.created_at asc
			limit 100
		`
	}

	rows, err := a.DB.Query(r.Context(), query, args...)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]Store, 0)
	for rows.Next() {
		var s Store
		if hasGeo {
			if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.ImageURL, &s.CreatedAt, &s.City, &s.Region, &s.DistanceKM, &s.IsDemo, &s.NextPickupDate); err != nil {
				resp.Internal(w, err)
				return
			}
		} else {
			if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.ImageURL, &s.CreatedAt, &s.City, &s.Region, &s.IsDemo, &s.NextPickupDate); err != nil {
				resp.Internal(w, err)
				return
			}
		}
		out = append(out, s)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

// CityEntry represents a city with active stores.
type CityEntry struct {
	City       string `json:"city"`
	Region     string `json:"region"`
	Slug       string `json:"slug"`
	StoreCount int    `json:"store_count"`
}

func (a PublicAPI) ListCities(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select pl.city, pl.region, count(distinct s.id)::int
		from stores s
		join pickup_locations pl on pl.store_id = s.id
		where s.is_active = true
			and s.is_demo = false
			and exists (
				select 1 from subscription_plans sp
				where sp.store_id = s.id and sp.is_active = true and sp.is_live = true
			)
		group by pl.city, pl.region
		order by count(distinct s.id) desc
	`)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]CityEntry, 0)
	for rows.Next() {
		var c CityEntry
		if err := rows.Scan(&c.City, &c.Region, &c.StoreCount); err != nil {
			resp.Internal(w, err)
			return
		}
		c.Slug = strings.ToLower(strings.ReplaceAll(c.City, " ", "-")) + "-" + strings.ToLower(c.Region)
		out = append(out, c)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

// WaitlistRequest is the body for POST /v1/waitlist.
type WaitlistRequest struct {
	Email string   `json:"email"`
	Lat   *float64 `json:"lat,omitempty"`
	Lng   *float64 `json:"lng,omitempty"`
}

func (a PublicAPI) JoinWaitlist(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	var in WaitlistRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Email = strings.TrimSpace(in.Email)
	if in.Email == "" || !strings.Contains(in.Email, "@") {
		resp.BadRequest(w, "email is required")
		return
	}

	_, err := a.DB.Exec(r.Context(), `
		insert into waitlist (email, lat, lng)
		values ($1, $2, $3)
		on conflict (lower(email)) do update set
			lat = coalesce(excluded.lat, waitlist.lat),
			lng = coalesce(excluded.lng, waitlist.lng)
	`, in.Email, in.Lat, in.Lng)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]bool{"joined": true})
}

type PickupWindow struct {
	ID             string    `json:"id"`
	StartAt        time.Time `json:"start_at"`
	EndAt          time.Time `json:"end_at"`
	CutoffAt       time.Time `json:"cutoff_at"`
	Status         string    `json:"status"`
	PickupLocation struct {
		ID           string   `json:"id"`
		Label        *string  `json:"label"`
		Address1     string   `json:"address1"`
		City         string   `json:"city"`
		Region       string   `json:"region"`
		Postal       string   `json:"postal_code"`
		Timezone     string   `json:"timezone"`
		Lat          *float64 `json:"lat"`
		Lng          *float64 `json:"lng"`
		Instructions *string  `json:"instructions"`
		PhotoURL     *string  `json:"photo_url,omitempty"`
	} `json:"pickup_location"`
}

func (a PublicAPI) ListStorePickupWindows(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	storeID := r.PathValue("storeId")
	if storeID == "" {
		resp.BadRequest(w, "missing storeId")
		return
	}

	status := r.URL.Query().Get("status")
	if status == "" {
		status = "published"
	}

	from := time.Now().UTC()
	if q := r.URL.Query().Get("from"); q != "" {
		t, err := time.Parse(time.RFC3339, q)
		if err != nil {
			resp.BadRequest(w, "invalid from (expected RFC3339)")
			return
		}
		from = t
	}

	rows, err := a.DB.Query(r.Context(), `
		select
			pw.id::text,
			pw.start_at,
			pw.end_at,
			pw.cutoff_at,
			pw.status,
			pl.id::text,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.postal_code,
			pl.timezone,
			pl.lat,
			pl.lng,
			pl.instructions,
			pl.photo_url
		from pickup_windows pw
		join pickup_locations pl on pl.id = pw.pickup_location_id
		where pw.store_id = $1::uuid
			and pw.status = $2
			and pw.start_at >= $3
		order by pw.start_at asc
		limit 50
	`, storeID, status, from)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]PickupWindow, 0)
	for rows.Next() {
		var pw PickupWindow
		if err := rows.Scan(
			&pw.ID,
			&pw.StartAt,
			&pw.EndAt,
			&pw.CutoffAt,
			&pw.Status,
			&pw.PickupLocation.ID,
			&pw.PickupLocation.Label,
			&pw.PickupLocation.Address1,
			&pw.PickupLocation.City,
			&pw.PickupLocation.Region,
			&pw.PickupLocation.Postal,
			&pw.PickupLocation.Timezone,
			&pw.PickupLocation.Lat,
			&pw.PickupLocation.Lng,
			&pw.PickupLocation.Instructions,
			&pw.PickupLocation.PhotoURL,
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

type PickupWindowDetail struct {
	ID        string    `json:"id"`
	StoreID   string    `json:"store_id"`
	StoreName string    `json:"store_name"`
	StartAt   time.Time `json:"start_at"`
	EndAt     time.Time `json:"end_at"`
	Status    string    `json:"status"`
	PickupLocation struct {
		Label    *string `json:"label"`
		Address1 string  `json:"address1"`
		City     string  `json:"city"`
		Region   string  `json:"region"`
		Timezone string  `json:"timezone"`
	} `json:"pickup_location"`
}

func (a PublicAPI) GetPickupWindow(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var pw PickupWindowDetail
	err := a.DB.QueryRow(r.Context(), `
		select
			pw.id::text,
			pw.store_id::text,
			s.name,
			pw.start_at,
			pw.end_at,
			pw.status,
			pl.label,
			pl.address1,
			pl.city,
			pl.region,
			pl.timezone
		from pickup_windows pw
		join pickup_locations pl on pl.id = pw.pickup_location_id
		join stores s on s.id = pw.store_id
		where pw.id = $1::uuid
		limit 1
	`, windowID).Scan(
		&pw.ID,
		&pw.StoreID,
		&pw.StoreName,
		&pw.StartAt,
		&pw.EndAt,
		&pw.Status,
		&pw.PickupLocation.Label,
		&pw.PickupLocation.Address1,
		&pw.PickupLocation.City,
		&pw.PickupLocation.Region,
		&pw.PickupLocation.Timezone,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup window not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, pw)
}

type Offering struct {
	ID              string  `json:"id"`
	PriceCents      int     `json:"price_cents"`
	QuantityAvail   int     `json:"quantity_available"`
	QuantityReserve int     `json:"quantity_reserved"`
	QuantityRemain  int     `json:"quantity_remaining"`
	Status          string  `json:"status"`
	Product         Product `json:"product"`
}

type Product struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Unit        string  `json:"unit"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url,omitempty"`
}

func (a PublicAPI) ListPickupWindowOfferings(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select
			o.id::text,
			o.price_cents,
			o.quantity_available,
			o.quantity_reserved,
			o.status,
			p.id::text,
			p.title,
			p.unit,
			p.description,
			pi.url
		from offerings o
		join products p on p.id = o.product_id
		left join lateral (
			select pimg.url
			from product_images pimg
			where pimg.product_id = p.id
			order by pimg.sort_order asc
			limit 1
		) pi on true
		where o.pickup_window_id = $1::uuid
			and o.status = 'active'
		order by p.title asc
		limit 200
	`, windowID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]Offering, 0)
	for rows.Next() {
		var o Offering
		if err := rows.Scan(
			&o.ID,
			&o.PriceCents,
			&o.QuantityAvail,
			&o.QuantityReserve,
			&o.Status,
			&o.Product.ID,
			&o.Product.Title,
			&o.Product.Unit,
			&o.Product.Description,
			&o.Product.ImageURL,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		o.QuantityRemain = o.QuantityAvail - o.QuantityReserve
		if o.QuantityRemain < 0 {
			o.QuantityRemain = 0
		}
		out = append(out, o)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

type PublicReview struct {
	ID        string    `json:"id"`
	Rating    int       `json:"rating"`
	Body      *string   `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

type ReviewsResponse struct {
	AvgRating   float64        `json:"avg_rating"`
	ReviewCount int            `json:"review_count"`
	Reviews     []PublicReview  `json:"reviews"`
}

func (a PublicAPI) ListStoreReviews(w http.ResponseWriter, r *http.Request) {
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
		select id::text, rating, body, created_at,
			count(*) over() as review_count,
			coalesce(avg(rating) over()::numeric(2,1), 0) as avg_rating
		from reviews
		where store_id = $1::uuid
		order by created_at desc
		limit 20
	`, storeID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	var avgRating float64
	var reviewCount int
	reviews := make([]PublicReview, 0)
	for rows.Next() {
		var rev PublicReview
		if err := rows.Scan(&rev.ID, &rev.Rating, &rev.Body, &rev.CreatedAt, &reviewCount, &avgRating); err != nil {
			resp.Internal(w, err)
			return
		}
		reviews = append(reviews, rev)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, ReviewsResponse{
		AvgRating:   avgRating,
		ReviewCount: reviewCount,
		Reviews:     reviews,
	})
}
