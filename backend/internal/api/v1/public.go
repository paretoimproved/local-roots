package v1

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type PublicAPI struct {
	DB *pgxpool.Pool
}

type Store struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	City        *string   `json:"city,omitempty"`
	Region      *string   `json:"region,omitempty"`
	DistanceKM  *float64  `json:"distance_km,omitempty"`
}

func (a PublicAPI) ListStores(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	q := r.URL.Query()
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

	if hasGeo {
		query = fmt.Sprintf(`
			select distinct on (s.id)
				s.id::text, s.name, s.description, s.created_at,
				pl.city, pl.region,
				6371 * acos(
					cos(radians(%f)) * cos(radians(pl.lat)) *
					cos(radians(pl.lng) - radians(%f)) +
					sin(radians(%f)) * sin(radians(pl.lat))
				) as distance_km
			from stores s
			join pickup_locations pl on pl.store_id = s.id
			where s.is_active = true
				and exists (
					select 1 from subscription_plans sp
					where sp.store_id = s.id
						and sp.is_active = true
						and sp.is_live = true
				)
				and 6371 * acos(
					cos(radians(%f)) * cos(radians(pl.lat)) *
					cos(radians(pl.lng) - radians(%f)) +
					sin(radians(%f)) * sin(radians(pl.lat))
				) <= %f
			order by s.id, distance_km asc
		`, lat, lng, lat, lat, lng, lat, radiusKM)

		// Wrap to re-order by distance
		query = `select * from (` + query + `) sub order by distance_km asc limit 100`
	} else {
		query = `
			select s.id::text, s.name, s.description, s.created_at,
				nearest.city, nearest.region
			from stores s
			left join lateral (
				select pl.city, pl.region
				from pickup_locations pl
				where pl.store_id = s.id
				limit 1
			) nearest on true
			where s.is_active = true
				and exists (
					select 1 from subscription_plans sp
					where sp.store_id = s.id
						and sp.is_active = true
						and sp.is_live = true
				)
			order by s.created_at desc
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
			if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.CreatedAt, &s.City, &s.Region, &s.DistanceKM); err != nil {
				resp.Internal(w, err)
				return
			}
		} else {
			if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.CreatedAt, &s.City, &s.Region); err != nil {
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

type PickupWindow struct {
	ID             string    `json:"id"`
	StartAt        time.Time `json:"start_at"`
	EndAt          time.Time `json:"end_at"`
	CutoffAt       time.Time `json:"cutoff_at"`
	Status         string    `json:"status"`
	PickupLocation struct {
		ID       string  `json:"id"`
		Label    *string `json:"label"`
		Address1 string  `json:"address1"`
		City     string  `json:"city"`
		Region   string  `json:"region"`
		Postal   string  `json:"postal_code"`
		Timezone string  `json:"timezone"`
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
			pl.timezone
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
			p.description
		from offerings o
		join products p on p.id = o.product_id
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

	var avgRating float64
	var reviewCount int
	err := a.DB.QueryRow(r.Context(), `
		select coalesce(avg(rating)::numeric(2,1), 0), count(*)
		from reviews
		where store_id = $1::uuid
	`, storeID).Scan(&avgRating, &reviewCount)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select id::text, rating, body, created_at
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

	reviews := make([]PublicReview, 0)
	for rows.Next() {
		var rev PublicReview
		if err := rows.Scan(&rev.ID, &rev.Rating, &rev.Body, &rev.CreatedAt); err != nil {
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
