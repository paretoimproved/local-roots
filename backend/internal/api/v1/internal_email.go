package v1

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type InternalEmailAPI struct {
	DB          *pgxpool.Pool
	Email       *email.Client
	Secret      string
	FrontendURL string
}

// SendPickupReminders sends reminder emails for orders with pickups 23-25 hours from now.
// Gated behind INTERNAL_CRON_SECRET. Idempotent: only sends once per order (reminder_sent_at).
func (a InternalEmailAPI) SendPickupReminders(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Email == nil || !a.Email.Enabled() {
		resp.ServiceUnavailable(w, "email not configured")
		return
	}
	if !a.requireSecret(w, r) {
		return
	}

	ctx := r.Context()
	now := time.Now().UTC()
	windowStart := now.Add(23 * time.Hour)
	windowEnd := now.Add(25 * time.Hour)

	rows, err := a.DB.Query(ctx, `
		select
			o.id::text,
			o.buyer_email,
			o.pickup_code,
			o.buyer_token,
			coalesce((select oi.product_title from order_items oi where oi.order_id = o.id limit 1), 'Order'),
			pw.start_at,
			coalesce(pl.label, ''),
			pl.address1,
			pl.city,
			pl.timezone
		from orders o
		join pickup_windows pw on pw.id = o.pickup_window_id
		join pickup_locations pl on pl.id = pw.pickup_location_id
		where o.status in ('placed', 'ready')
			and o.reminder_sent_at is null
			and pw.start_at >= $1
			and pw.start_at <= $2
		order by pw.start_at asc
		limit 500
	`, windowStart, windowEnd)
	if err != nil {
		resp.Internal(w, err)
		return
	}
	defer rows.Close()

	type reminder struct {
		orderID    string
		buyerEmail string
		pickupCode string
		buyerToken string
		boxTitle   string
		startAt    time.Time
		locLabel   string
		addr       string
		city       string
		timezone   string
	}

	var reminders []reminder
	for rows.Next() {
		var rem reminder
		if err := rows.Scan(
			&rem.orderID, &rem.buyerEmail, &rem.pickupCode, &rem.buyerToken,
			&rem.boxTitle, &rem.startAt, &rem.locLabel, &rem.addr, &rem.city, &rem.timezone,
		); err != nil {
			resp.Internal(w, err)
			return
		}
		reminders = append(reminders, rem)
	}
	if rows.Err() != nil {
		resp.Internal(w, rows.Err())
		return
	}

	sent := 0
	baseURL := strings.TrimRight(a.FrontendURL, "/")

	for _, rem := range reminders {
		loc, err := time.LoadLocation(rem.timezone)
		if err != nil {
			loc = time.UTC
		}
		pickupTime := rem.startAt.In(loc).Format("Mon Jan 2 at 3:04 PM")
		location := joinNonEmpty(", ", rem.locLabel, rem.addr, rem.city)
		orderURL := baseURL + "/orders/" + rem.orderID + "?t=" + rem.buyerToken

		subj, body := email.PickupReminder(rem.boxTitle, pickupTime, location, rem.pickupCode, orderURL)
		if err := a.Email.Send(rem.buyerEmail, subj, body); err != nil {
			continue
		}

		_, _ = a.DB.Exec(ctx, `
			update orders set reminder_sent_at = now() where id = $1::uuid
		`, rem.orderID)
		sent++
	}

	resp.OK(w, map[string]any{
		"candidates": len(reminders),
		"sent":       sent,
	})
}

func (a InternalEmailAPI) requireSecret(w http.ResponseWriter, r *http.Request) bool {
	secret := strings.TrimSpace(a.Secret)
	if secret == "" {
		resp.ServiceUnavailable(w, "internal secret not configured")
		return false
	}
	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		resp.Unauthorized(w, "missing token")
		return false
	}
	if strings.TrimSpace(parts[1]) != secret {
		resp.Unauthorized(w, "invalid token")
		return false
	}
	return true
}

func joinNonEmpty(sep string, parts ...string) string {
	var out []string
	for _, p := range parts {
		if strings.TrimSpace(p) != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, sep)
}
