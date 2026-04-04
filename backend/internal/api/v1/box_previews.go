package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type BoxPreviewAPI struct {
	DB *pgxpool.Pool
}

type BoxPreview struct {
	ID        string    `json:"id"`
	PlanID    string    `json:"plan_id"`
	CycleDate string    `json:"cycle_date"`
	Body      string    `json:"body"`
	PhotoURL  *string   `json:"photo_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateBoxPreviewRequest struct {
	CycleDate string  `json:"cycle_date"`
	Body      string  `json:"body"`
	PhotoURL  *string `json:"photo_url"`
}

// Create upserts a box preview for a plan+cycle_date.
func (a BoxPreviewAPI) Create(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	var in CreateBoxPreviewRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}
	in.Body = strings.TrimSpace(in.Body)
	in.CycleDate = strings.TrimSpace(in.CycleDate)
	if in.CycleDate == "" {
		resp.BadRequest(w, "cycle_date is required")
		return
	}
	if _, err := time.Parse("2006-01-02", in.CycleDate); err != nil {
		resp.BadRequest(w, "cycle_date must be YYYY-MM-DD")
		return
	}

	// Verify plan belongs to store.
	var ownerStoreID string
	if err := a.DB.QueryRow(r.Context(), `select store_id::text from subscription_plans where id = $1::uuid`, planID).Scan(&ownerStoreID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerStoreID != sc.StoreID {
		resp.NotFound(w, "plan not found")
		return
	}

	var bp BoxPreview
	err := a.DB.QueryRow(r.Context(), `
		insert into box_previews (plan_id, cycle_date, body, photo_url)
		values ($1::uuid, $2::date, $3, $4)
		on conflict (plan_id, cycle_date) do update
		set body = excluded.body,
		    photo_url = excluded.photo_url,
		    updated_at = now()
		returning id::text, plan_id::text, cycle_date::text, body, photo_url, created_at, updated_at
	`, planID, in.CycleDate, in.Body, in.PhotoURL).Scan(
		&bp.ID, &bp.PlanID, &bp.CycleDate, &bp.Body, &bp.PhotoURL, &bp.CreatedAt, &bp.UpdatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, bp)
}

// List returns all previews for a plan (most recent first).
func (a BoxPreviewAPI) List(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	// Verify plan belongs to store.
	var ownerStoreID string
	if err := a.DB.QueryRow(r.Context(), `select store_id::text from subscription_plans where id = $1::uuid`, planID).Scan(&ownerStoreID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerStoreID != sc.StoreID {
		resp.NotFound(w, "plan not found")
		return
	}

	rows, err := a.DB.Query(r.Context(), `
		select id::text, plan_id::text, cycle_date::text, body, photo_url, created_at, updated_at
		from box_previews
		where plan_id = $1::uuid
		order by cycle_date desc
		limit 50
	`, planID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	out := make([]BoxPreview, 0)
	for rows.Next() {
		var bp BoxPreview
		if err := rows.Scan(&bp.ID, &bp.PlanID, &bp.CycleDate, &bp.Body, &bp.PhotoURL, &bp.CreatedAt, &bp.UpdatedAt); err != nil {
			resp.Internal(w, err)
			return
		}
		out = append(out, bp)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	resp.OK(w, out)
}

// Delete removes a single box preview.
func (a BoxPreviewAPI) Delete(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	planID := r.PathValue("planId")
	previewID := r.PathValue("previewId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}
	if previewID == "" || !validUUID(previewID) {
		resp.BadRequest(w, "missing or invalid previewId")
		return
	}

	// Verify plan belongs to store.
	var ownerStoreID string
	if err := a.DB.QueryRow(r.Context(), `select store_id::text from subscription_plans where id = $1::uuid`, planID).Scan(&ownerStoreID); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "plan not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if ownerStoreID != sc.StoreID {
		resp.NotFound(w, "plan not found")
		return
	}

	tag, err := a.DB.Exec(r.Context(), `
		delete from box_previews where id = $1::uuid and plan_id = $2::uuid
	`, previewID, planID)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		resp.NotFound(w, "preview not found")
		return
	}

	resp.OK(w, map[string]bool{"deleted": true})
}

// Latest returns the most recent preview for a plan (public, no auth).
func (a BoxPreviewAPI) Latest(w http.ResponseWriter, r *http.Request) {
	planID := r.PathValue("planId")
	if planID == "" || !validUUID(planID) {
		resp.BadRequest(w, "missing or invalid planId")
		return
	}

	var bp BoxPreview
	err := a.DB.QueryRow(r.Context(), `
		select id::text, plan_id::text, cycle_date::text, body, photo_url, created_at, updated_at
		from box_previews
		where plan_id = $1::uuid
		order by cycle_date desc
		limit 1
	`, planID).Scan(&bp.ID, &bp.PlanID, &bp.CycleDate, &bp.Body, &bp.PhotoURL, &bp.CreatedAt, &bp.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "no preview found")
			return
		}
		resp.Internal(w, err)
		return
	}

	resp.OK(w, bp)
}
