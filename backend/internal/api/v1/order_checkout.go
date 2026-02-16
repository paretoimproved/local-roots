package v1

import (
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type OrderCheckoutAPI struct {
	DB              *pgxpool.Pool
	Stripe          *stripepay.Client
	BuyerFeeBps     int
	BuyerFeeFlatCts int
}

type OrderCheckoutRequest struct {
	Buyer struct {
		Email string  `json:"email"`
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	} `json:"buyer"`
	Items []struct {
		OfferingID string `json:"offering_id"`
		Quantity   int    `json:"quantity"`
	} `json:"items"`
}

type OrderCheckoutResponse struct {
	PaymentIntentID string `json:"payment_intent_id"`
	ClientSecret    string `json:"client_secret"`
	SubtotalCents   int    `json:"subtotal_cents"`
	BuyerFeeCents   int    `json:"buyer_fee_cents"`
	TotalCents      int    `json:"total_cents"`
}

func (a OrderCheckoutAPI) Checkout(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}

	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var in OrderCheckoutRequest
	if err := resp.DecodeJSON(w, r, &in); err != nil {
		resp.BadRequest(w, "invalid json")
		return
	}

	buyerEmail := strings.ToLower(strings.TrimSpace(in.Buyer.Email))
	if buyerEmail == "" || !strings.Contains(buyerEmail, "@") {
		resp.BadRequest(w, "invalid buyer email")
		return
	}
	if len(in.Items) == 0 {
		resp.BadRequest(w, "at least one item is required")
		return
	}

	ctx := r.Context()

	// Verify pickup window exists and is available.
	var status string
	if err := a.DB.QueryRow(ctx, `
		select status from pickup_windows where id = $1::uuid
	`, windowID).Scan(&status); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup window not found")
			return
		}
		resp.Internal(w, err)
		return
	}
	if status != "published" {
		resp.BadRequest(w, "pickup window is not available")
		return
	}

	// Calculate subtotal from offerings.
	var subtotal int
	for _, it := range in.Items {
		oid := strings.TrimSpace(it.OfferingID)
		if oid == "" || it.Quantity <= 0 {
			resp.BadRequest(w, "invalid items")
			return
		}
		var priceCents int
		if err := a.DB.QueryRow(ctx, `
			select price_cents from offerings
			where id = $1::uuid and pickup_window_id = $2::uuid and status = 'active'
		`, oid, windowID).Scan(&priceCents); err != nil {
			if err == pgx.ErrNoRows {
				resp.BadRequest(w, "offering not available")
				return
			}
			resp.Internal(w, err)
			return
		}
		subtotal += priceCents * it.Quantity
	}
	if subtotal <= 0 {
		resp.BadRequest(w, "total must be greater than zero")
		return
	}

	// Calculate buyer fee (same formula as subscription checkout).
	buyerFee := (subtotal * a.BuyerFeeBps) / 10000
	if a.BuyerFeeFlatCts > 0 {
		buyerFee += a.BuyerFeeFlatCts
	}
	total := subtotal + buyerFee

	// Find or create Stripe customer.
	customerID, err := a.Stripe.FindOrCreateCustomer(ctx, buyerEmail, in.Buyer.Name, in.Buyer.Phone)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Create PaymentIntent with manual capture.
	piID, clientSecret, err := a.Stripe.CreateCheckoutPaymentIntent(ctx, stripepay.CreateCheckoutPaymentIntentInput{
		AmountCents: total,
		Currency:    "usd",
		CustomerID:  customerID,
		Metadata: map[string]string{
			"pickup_window_id": windowID,
			"type":             "one_time_order",
		},
	})
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, OrderCheckoutResponse{
		PaymentIntentID: piID,
		ClientSecret:    clientSecret,
		SubtotalCents:   subtotal,
		BuyerFeeCents:   buyerFee,
		TotalCents:      total,
	})
}
