package v1

import (
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
	"github.com/paretoimproved/local-roots/backend/internal/resp"
)

type SellerConnectAPI struct {
	DB          *pgxpool.Pool
	Stripe      *stripepay.Client
	FrontendURL string
}

type ConnectStatusResponse struct {
	Status string `json:"status"` // none, onboarding, active, restricted
}

// Onboard creates a Stripe Connect Express account for the store (if needed)
// and returns the Stripe onboarding URL.
func (a SellerConnectAPI) Onboard(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	if strings.TrimSpace(a.FrontendURL) == "" {
		resp.ServiceUnavailable(w, "frontend URL not configured")
		return
	}

	ctx := r.Context()

	// Load or create the Connect account.
	var stripeAccountID *string
	var email string
	if err := a.DB.QueryRow(ctx, `
		select stripe_account_id, (select email from users where id = stores.owner_user_id)
		from stores
		where id = $1::uuid
	`, sc.StoreID).Scan(&stripeAccountID, &email); err != nil {
		resp.Internal(w, err)
		return
	}

	accountID := ""
	if stripeAccountID != nil && strings.TrimSpace(*stripeAccountID) != "" {
		accountID = strings.TrimSpace(*stripeAccountID)
	} else {
		// Create a new Express account.
		id, err := a.Stripe.CreateConnectAccount(ctx, email)
		if err != nil {
			resp.Internal(w, err)
			return
		}
		accountID = id
		if _, err := a.DB.Exec(ctx, `
			update stores
			set stripe_account_id = $2,
				stripe_account_status = 'onboarding',
				updated_at = now()
			where id = $1::uuid
		`, sc.StoreID, accountID); err != nil {
			resp.Internal(w, err)
			return
		}
	}

	// Create an account link for onboarding.
	baseURL := strings.TrimRight(a.FrontendURL, "/")
	refreshURL := baseURL + "/seller/stores/" + sc.StoreID + "/settings?connect=refresh"
	returnURL := baseURL + "/seller/stores/" + sc.StoreID + "/settings?connect=return"

	url, err := a.Stripe.CreateAccountLink(ctx, accountID, refreshURL, returnURL)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{
		"url":        url,
		"account_id": accountID,
	})
}

// GetStatus fetches the Connect account status from Stripe and updates the local DB.
func (a SellerConnectAPI) GetStatus(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}

	ctx := r.Context()

	var stripeAccountID *string
	var currentStatus string
	if err := a.DB.QueryRow(ctx, `
		select stripe_account_id, stripe_account_status
		from stores
		where id = $1::uuid
	`, sc.StoreID).Scan(&stripeAccountID, &currentStatus); err != nil {
		resp.Internal(w, err)
		return
	}

	if stripeAccountID == nil || strings.TrimSpace(*stripeAccountID) == "" {
		resp.OK(w, ConnectStatusResponse{Status: "none"})
		return
	}

	// Fetch latest status from Stripe.
	acctStatus, err := a.Stripe.GetAccountStatus(ctx, *stripeAccountID)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	// Update local DB if status changed.
	if acctStatus.Status != currentStatus {
		if _, err := a.DB.Exec(ctx, `
			update stores
			set stripe_account_status = $2, updated_at = now()
			where id = $1::uuid
		`, sc.StoreID, acctStatus.Status); err != nil {
			resp.Internal(w, err)
			return
		}
	}

	resp.OK(w, ConnectStatusResponse{Status: acctStatus.Status})
}

// RefreshLink generates a new onboarding URL for expired links.
func (a SellerConnectAPI) RefreshLink(w http.ResponseWriter, r *http.Request, u AuthUser, sc StoreContext) {
	if a.Stripe == nil || !a.Stripe.Enabled() {
		resp.ServiceUnavailable(w, "payments not configured")
		return
	}
	if strings.TrimSpace(a.FrontendURL) == "" {
		resp.ServiceUnavailable(w, "frontend URL not configured")
		return
	}

	ctx := r.Context()

	var stripeAccountID *string
	if err := a.DB.QueryRow(ctx, `
		select stripe_account_id
		from stores
		where id = $1::uuid
	`, sc.StoreID).Scan(&stripeAccountID); err != nil {
		resp.Internal(w, err)
		return
	}

	if stripeAccountID == nil || strings.TrimSpace(*stripeAccountID) == "" {
		resp.BadRequest(w, "Connect account not found; start onboarding first")
		return
	}

	baseURL := strings.TrimRight(a.FrontendURL, "/")
	refreshURL := baseURL + "/seller/stores/" + sc.StoreID + "/settings?connect=refresh"
	returnURL := baseURL + "/seller/stores/" + sc.StoreID + "/settings?connect=return"

	url, err := a.Stripe.CreateAccountLink(ctx, *stripeAccountID, refreshURL, returnURL)
	if err != nil {
		resp.Internal(w, err)
		return
	}

	resp.OK(w, map[string]any{"url": url})
}
