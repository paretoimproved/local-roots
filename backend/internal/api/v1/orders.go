package v1

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	stripe "github.com/stripe/stripe-go/v78"

	"github.com/paretoimproved/local-roots/backend/internal/auth"
	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func validUUID(s string) bool {
	return uuidRe.MatchString(s)
}

func extractBuyerToken(r *http.Request) string {
	authz := strings.TrimSpace(r.Header.Get("Authorization"))
	parts := strings.SplitN(authz, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

// buyerIdentity holds the result of resolving buyer auth — either JWT-based
// (userID set) or opaque-token-based (buyerToken set).
type buyerIdentity struct {
	userID     *string // non-nil when authenticated via buyer JWT
	buyerToken *string // non-nil when authenticated via opaque buyer_token
}

func (bi buyerIdentity) isAuthenticated() bool {
	return bi.userID != nil || bi.buyerToken != nil
}

// resolveBuyerAuth tries JWT (buyer role) first, then falls back to the raw
// opaque buyer_token. Both buyer_orders and buyer_subscriptions use this.
func resolveBuyerAuth(r *http.Request, jwtSecret string) buyerIdentity {
	raw := extractBuyerToken(r)
	if raw == "" {
		return buyerIdentity{}
	}
	if jwtSecret != "" {
		claims, err := auth.ParseJWT([]byte(jwtSecret), raw)
		if err == nil && claims.UserID != "" {
			return buyerIdentity{userID: &claims.UserID}
		}
	}
	return buyerIdentity{buyerToken: &raw}
}

type OrdersAPI struct {
	DB              *pgxpool.Pool
	Stripe          *stripepay.Client
	BuyerFeeBps     int
	BuyerFeeFlatCts int
	Email           *email.Client
	FrontendURL     string
}

type CreateOrderRequest struct {
	Buyer struct {
		Email string  `json:"email"`
		Name  *string `json:"name"`
		Phone *string `json:"phone"`
	} `json:"buyer"`
	Items []struct {
		OfferingID string `json:"offering_id"`
		Quantity   int    `json:"quantity"`
	} `json:"items"`
	PaymentMethod         string `json:"payment_method"`
	StripePaymentIntentID string `json:"stripe_payment_intent_id"`
}

type OrderItem struct {
	ID             string  `json:"id"`
	OfferingID     *string `json:"offering_id"`
	ProductTitle   string  `json:"product_title"`
	ProductUnit    string  `json:"product_unit"`
	PriceCents     int     `json:"price_cents"`
	Quantity       int     `json:"quantity"`
	LineTotalCents int     `json:"line_total_cents"`
}

type Order struct {
	ID             string      `json:"id"`
	StoreID        string      `json:"store_id"`
	PickupWindowID string      `json:"pickup_window_id"`
	SubscriptionID *string     `json:"subscription_id"`
	BuyerToken     string      `json:"buyer_token"`
	PickupCode     string      `json:"pickup_code"`
	BuyerEmail     string      `json:"buyer_email"`
	BuyerName      *string     `json:"buyer_name"`
	BuyerPhone     *string     `json:"buyer_phone"`
	Status         string      `json:"status"`
	PaymentMethod  string      `json:"payment_method"`
	PaymentStatus  string      `json:"payment_status"`
	SubtotalCents  int         `json:"subtotal_cents"`
	BuyerFeeCents  int         `json:"buyer_fee_cents"`
	TotalCents     int         `json:"total_cents"`
	CapturedCents  int         `json:"captured_cents"`
	CreatedAt      time.Time   `json:"created_at"`
	Items          []OrderItem `json:"items"`
}

func (a OrdersAPI) CreateOrder(w http.ResponseWriter, r *http.Request) {
	if a.DB == nil {
		resp.ServiceUnavailable(w, "database not configured")
		return
	}

	windowID := r.PathValue("pickupWindowId")
	if windowID == "" {
		resp.BadRequest(w, "missing pickupWindowId")
		return
	}

	var in CreateOrderRequest
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
	if len(in.Items) > 50 {
		resp.BadRequest(w, "too many items")
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
		storeID  string
		status   string
		cutoffAt time.Time
	)
	if err := tx.QueryRow(ctx, `
		select store_id::text, status, cutoff_at
		from pickup_windows
		where id = $1::uuid
		limit 1
	`, windowID).Scan(&storeID, &status, &cutoffAt); err != nil {
		if err == pgx.ErrNoRows {
			resp.NotFound(w, "pickup window not found")
			return
		}
		resp.Internal(w, err)
		return
	}

	now := time.Now().UTC()
	if status != "published" {
		resp.BadRequest(w, "pickup window is not available")
		return
	}
	if !cutoffAt.After(now) {
		resp.BadRequest(w, "pickup window cutoff has passed")
		return
	}

	type resolvedItem struct {
		offeringID   string
		productTitle string
		productUnit  string
		priceCents   int
		qty          int
		lineTotal    int
	}

	var (
		items    []resolvedItem
		subtotal int
	)

	// Resolve + lock offerings to reserve inventory.
	for _, it := range in.Items {
		oid := strings.TrimSpace(it.OfferingID)
		if oid == "" || it.Quantity <= 0 {
			resp.BadRequest(w, "invalid items")
			return
		}

		var (
			priceCents   int
			qtyAvail     int
			qtyReserved  int
			productTitle string
			productUnit  string
		)
		err := tx.QueryRow(ctx, `
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
				and o.status = 'active'
			for update
		`, oid, windowID).Scan(&priceCents, &qtyAvail, &qtyReserved, &productTitle, &productUnit)
		if err != nil {
			if err == pgx.ErrNoRows {
				resp.BadRequest(w, "offering not available")
				return
			}
			resp.Internal(w, err)
			return
		}

		remain := qtyAvail - qtyReserved
		if remain < it.Quantity {
			resp.BadRequest(w, "insufficient inventory")
			return
		}

		if _, err := tx.Exec(ctx, `
			update offerings
			set quantity_reserved = quantity_reserved + $2
			where id = $1::uuid
		`, oid, it.Quantity); err != nil {
			resp.Internal(w, err)
			return
		}

		line := priceCents * it.Quantity
		subtotal += line
		items = append(items, resolvedItem{
			offeringID:   oid,
			productTitle: productTitle,
			productUnit:  productUnit,
			priceCents:   priceCents,
			qty:          it.Quantity,
			lineTotal:    line,
		})
	}

	// Calculate buyer fee.
	buyerFee := (subtotal * a.BuyerFeeBps) / 10000
	if a.BuyerFeeFlatCts > 0 {
		buyerFee += a.BuyerFeeFlatCts
	}
	total := subtotal + buyerFee

	// Validate payment — card is the only accepted method.
	if strings.TrimSpace(in.PaymentMethod) != "card" {
		resp.BadRequest(w, "payment_method must be 'card'")
		return
	}
	piID := strings.TrimSpace(in.StripePaymentIntentID)
	if piID == "" {
		resp.BadRequest(w, "stripe_payment_intent_id is required")
		return
	}

	paymentMethod := "card"
	paymentStatus := "pending"
	stripePI := &piID

	// When Stripe is configured, verify the payment intent.
	if a.Stripe != nil && a.Stripe.Enabled() {
		pi, err := a.Stripe.RetrievePaymentIntent(ctx, piID)
		if err != nil {
			resp.BadRequest(w, "invalid payment intent")
			return
		}
		if pi.Status != stripe.PaymentIntentStatusRequiresCapture {
			resp.BadRequest(w, "payment not authorized")
			return
		}
		if int(pi.Amount) != total {
			resp.BadRequest(w, "payment amount mismatch")
			return
		}
		paymentStatus = "authorized"
	}

	var out Order
	out.BuyerEmail = buyerEmail
	out.BuyerName = in.Buyer.Name
	out.BuyerPhone = in.Buyer.Phone
	out.StoreID = storeID
	out.PickupWindowID = windowID
	out.SubtotalCents = subtotal
	out.BuyerFeeCents = buyerFee
	out.TotalCents = total

	err = tx.QueryRow(ctx, `
		insert into orders (store_id, pickup_window_id, buyer_email, buyer_name, buyer_phone, status, payment_method, payment_status, subtotal_cents, buyer_fee_cents, total_cents, stripe_payment_intent_id)
		values ($1::uuid, $2::uuid, $3, $4, $5, 'placed', $6, $7, $8, $9, $10, $11)
		returning id::text, buyer_token, pickup_code, status, payment_method, payment_status, captured_cents, created_at
	`, storeID, windowID, buyerEmail, in.Buyer.Name, in.Buyer.Phone, paymentMethod, paymentStatus, subtotal, buyerFee, total, stripePI).Scan(
		&out.ID,
		&out.BuyerToken,
		&out.PickupCode,
		&out.Status,
		&out.PaymentMethod,
		&out.PaymentStatus,
		&out.CapturedCents,
		&out.CreatedAt,
	)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	for _, it := range items {
		var itemID string
		if err := tx.QueryRow(ctx, `
			insert into order_items (order_id, offering_id, product_title, product_unit, price_cents, quantity, line_total_cents)
			values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
			returning id::text
		`, out.ID, it.offeringID, it.productTitle, it.productUnit, it.priceCents, it.qty, it.lineTotal).Scan(&itemID); err != nil {
			resp.Internal(w, err)
			return
		}
		oid := it.offeringID
		out.Items = append(out.Items, OrderItem{
			ID:             itemID,
			OfferingID:     &oid,
			ProductTitle:   it.productTitle,
			ProductUnit:    it.productUnit,
			PriceCents:     it.priceCents,
			Quantity:       it.qty,
			LineTotalCents: it.lineTotal,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		resp.Internal(w, err)
		return
	}

	// Send order confirmation email to buyer + new order notification to seller (fire-and-forget).
	if a.Email != nil && a.Email.Enabled() && a.FrontendURL != "" {
		boxTitle := "Order"
		if len(items) > 0 {
			boxTitle = items[0].productTitle
		}
		baseURL := strings.TrimRight(a.FrontendURL, "/")
		orderURL := fmt.Sprintf("%s/orders/%s?t=%s", baseURL, out.ID, out.BuyerToken)
		subj, body := email.OneTimeOrderConfirmed(boxTitle, out.PickupCode, orderURL)
		a.Email.SendAsync(buyerEmail, subj, body)

		// Notify seller of the new order.
		go func() {
			var sellerEmail, storeName string
			err := a.DB.QueryRow(ctx, `
				SELECT u.email, s.name
				FROM stores s JOIN users u ON u.id = s.owner_user_id
				WHERE s.id = $1::uuid
			`, storeID).Scan(&sellerEmail, &storeName)
			if err != nil {
				log.Printf("email: could not fetch seller for store %s: %v", storeID, err)
				return
			}
			subj, body := email.NewOrderNotification(buyerEmail, boxTitle, storeName)
			a.Email.SendAsync(sellerEmail, subj, body)
		}()
	}

	resp.OK(w, out)
}
