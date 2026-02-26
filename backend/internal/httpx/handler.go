package httpx

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/paretoimproved/local-roots/backend/internal/api/v1"
	"github.com/paretoimproved/local-roots/backend/internal/config"
	"github.com/paretoimproved/local-roots/backend/internal/email"
	"github.com/paretoimproved/local-roots/backend/internal/health"
	"github.com/paretoimproved/local-roots/backend/internal/payments/stripepay"
)

type Deps struct {
	Config config.Config
	DB     *pgxpool.Pool
}

func NewHandler(deps Deps) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", health.Handler(deps.DB))

	// Placeholder for versioned API.
	mux.HandleFunc("GET /v1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"name":"local-roots","env":"` + deps.Config.Env + `"}`))
	})

	var stripeClient *stripepay.Client
	if c, err := stripepay.New(deps.Config.StripeSecretKey); err == nil {
		stripeClient = c
	}

	emailClient := email.New(deps.Config.ResendAPIKey, deps.Config.EmailFrom)

	public := v1.PublicAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
	mux.HandleFunc("GET /v1/stores", public.ListStores)
	mux.HandleFunc("GET /v1/stores/{storeId}", public.GetStore)
	mux.HandleFunc("GET /v1/stores/{storeId}/pickup-windows", public.ListStorePickupWindows)
	mux.HandleFunc("GET /v1/pickup-windows/{pickupWindowId}", public.GetPickupWindow)
	mux.HandleFunc("GET /v1/pickup-windows/{pickupWindowId}/offerings", public.ListPickupWindowOfferings)
	mux.HandleFunc("GET /v1/stores/{storeId}/reviews", public.ListStoreReviews)

	sub := v1.SubscriptionAPI{
		DB:              deps.DB,
		Stripe:          stripeClient,
		BuyerFeeBps:     deps.Config.BuyerFeeBps,
		BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents,
		Email:           emailClient,
		FrontendURL:     deps.Config.FrontendURL,
	}
	mux.HandleFunc("GET /v1/stores/{storeId}/subscription-plans", sub.ListStorePlans)
	mux.HandleFunc("GET /v1/subscription-plans/{planId}", sub.GetPlan)
	mux.HandleFunc("POST /v1/subscription-plans/{planId}/checkout", WithRateLimit("checkout", sub.Checkout))
	mux.HandleFunc("POST /v1/subscription-plans/{planId}/subscribe", WithRateLimit("checkout", sub.Subscribe))

	orders := v1.OrdersAPI{
		DB:              deps.DB,
		Stripe:          stripeClient,
		BuyerFeeBps:     deps.Config.BuyerFeeBps,
		BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents,
		Email:           emailClient,
		FrontendURL:     deps.Config.FrontendURL,
	}
	mux.HandleFunc("POST /v1/pickup-windows/{pickupWindowId}/orders", orders.CreateOrder)

	orderCheckout := v1.OrderCheckoutAPI{
		DB:              deps.DB,
		Stripe:          stripeClient,
		BuyerFeeBps:     deps.Config.BuyerFeeBps,
		BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents,
	}
	mux.HandleFunc("POST /v1/pickup-windows/{pickupWindowId}/checkout", WithRateLimit("checkout", orderCheckout.Checkout))

	buyerOrders := v1.BuyerOrdersAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
	mux.HandleFunc("GET /v1/orders/{orderId}", buyerOrders.GetOrder)
	mux.HandleFunc("POST /v1/orders/{orderId}/review", buyerOrders.CreateReview)

	buyerSubs := v1.BuyerSubscriptionsAPI{DB: deps.DB, Stripe: stripeClient, JWTSecret: deps.Config.JWTSecret, Email: emailClient, FrontendURL: deps.Config.FrontendURL}
	mux.HandleFunc("GET /v1/subscriptions/{subscriptionId}", buyerSubs.GetSubscription)
	mux.HandleFunc("POST /v1/subscriptions/{subscriptionId}/status", buyerSubs.UpdateStatus)
	mux.HandleFunc("POST /v1/subscriptions/{subscriptionId}/payment-method/setup", buyerSubs.SetupPaymentMethod)
	mux.HandleFunc("POST /v1/subscriptions/{subscriptionId}/payment-method/confirm", buyerSubs.ConfirmPaymentMethod)

	stripeWebhook := v1.StripeWebhookAPI{DB: deps.DB, WebhookSecret: deps.Config.StripeWebhookSecret}
	mux.HandleFunc("POST /v1/stripe/webhook", WithRateLimit("webhook", stripeWebhook.StripeWebhook))

	authAPI := v1.AuthAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
	mux.HandleFunc("POST /v1/auth/register", WithRateLimit("auth", authAPI.Register))
	mux.HandleFunc("POST /v1/auth/login", WithRateLimit("auth", authAPI.Login))

	oauthAPI := v1.OAuthAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret, GoogleOAuthClientID: deps.Config.GoogleOAuthClientID}
	mux.HandleFunc("POST /v1/auth/google", WithRateLimit("auth", oauthAPI.GoogleLogin))

	buyerAuthAPI := v1.BuyerAuthAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret, Email: emailClient, FrontendURL: deps.Config.FrontendURL}
	mux.HandleFunc("POST /v1/buyer/auth/magic-link", WithRateLimit("auth", buyerAuthAPI.SendMagicLink))
	mux.HandleFunc("POST /v1/buyer/auth/verify", WithRateLimit("auth", buyerAuthAPI.Verify))
	mux.HandleFunc("GET /v1/buyer/me", authAPI.RequireUser(buyerAuthAPI.GetMe))
	mux.HandleFunc("GET /v1/buyer/orders", authAPI.RequireUser(buyerAuthAPI.ListOrders))
	mux.HandleFunc("GET /v1/buyer/subscriptions", authAPI.RequireUser(buyerAuthAPI.ListSubscriptions))

	seller := v1.SellerAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/seller/stores", authAPI.RequireUser(seller.ListMyStores))
	mux.HandleFunc("POST /v1/seller/stores", authAPI.RequireUser(seller.CreateStore))
	mux.HandleFunc("PATCH /v1/seller/stores/{storeId}", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.UpdateStore)))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-locations", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.ListPickupLocations)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-locations", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.CreatePickupLocation)))
	mux.HandleFunc("DELETE /v1/seller/stores/{storeId}/pickup-locations/{pickupLocationId}", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.DeletePickupLocation)))
	mux.HandleFunc("PATCH /v1/seller/stores/{storeId}/pickup-locations/{pickupLocationId}", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.UpdatePickupLocation)))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.ListPickupWindows)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-windows", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.CreatePickupWindow)))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/products", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.ListProducts)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/products", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.CreateProduct)))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/offerings", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.ListOfferings)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/offerings", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, seller.CreateOffering)))

	sellerOrders := v1.SellerOrdersAPI{DB: deps.DB, Stripe: stripeClient, NoShowFeeCents: deps.Config.NoShowFeeCents, NoShowPlatformSplitBps: deps.Config.NoShowPlatformSplitBps, Email: emailClient, FrontendURL: deps.Config.FrontendURL}
	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/orders", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerOrders.ListOrdersForPickupWindow)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/{orderId}/status", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerOrders.UpdateOrderStatus)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/{orderId}/confirm-pickup", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerOrders.ConfirmPickup)))

	pickupConfirm := v1.PickupConfirmAPI{DB: deps.DB, Stripe: stripeClient, Email: emailClient, FrontendURL: deps.Config.FrontendURL}
	mux.HandleFunc("GET /v1/seller/pickup/preview", authAPI.RequireUser(pickupConfirm.Preview))
	mux.HandleFunc("POST /v1/seller/pickup/confirm", authAPI.RequireUser(pickupConfirm.Confirm))

	sellerPayouts := v1.SellerPayoutsAPI{DB: deps.DB, NoShowPlatformSplitBps: deps.Config.NoShowPlatformSplitBps}
	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/payout-summary", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerPayouts.GetPickupWindowPayoutSummary)))

	sellerConnect := v1.SellerConnectAPI{DB: deps.DB, Stripe: stripeClient, FrontendURL: deps.Config.FrontendURL}
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/connect/onboard", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerConnect.Onboard)))
	mux.HandleFunc("GET /v1/seller/stores/{storeId}/connect/status", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerConnect.GetStatus)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/connect/refresh-link", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerConnect.RefreshLink)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/connect/account-session", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerConnect.AccountSession)))

	sellerSub := v1.SellerSubscriptionAPI{
		DB:              deps.DB,
		Stripe:          stripeClient,
		BuyerFeeBps:     deps.Config.BuyerFeeBps,
		BuyerFeeFlatCts: deps.Config.BuyerFeeFlatCents,
	}
	mux.HandleFunc("GET /v1/seller/stores/{storeId}/subscription-plans", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerSub.ListPlans)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/subscription-plans", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerSub.CreatePlan)))
	mux.HandleFunc("PATCH /v1/seller/stores/{storeId}/subscription-plans/{planId}", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerSub.UpdatePlan)))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/subscription-plans/{planId}/generate-cycle", authAPI.RequireUser(v1.RequireStoreOwner(deps.DB, sellerSub.GenerateNextCycle)))

	geo := v1.GeoAPI{GooglePlacesAPIKey: deps.Config.GooglePlacesAPIKey}
	mux.HandleFunc("GET /v1/places/autocomplete", geo.PublicAutocomplete)
	mux.HandleFunc("GET /v1/geocode", geo.PublicGeocode)
	mux.HandleFunc("POST /v1/seller/geo/places/autocomplete", authAPI.RequireUser(geo.PlacesAutocomplete))
	mux.HandleFunc("POST /v1/seller/geo/places/details", authAPI.RequireUser(geo.PlacesDetails))
	mux.HandleFunc("POST /v1/seller/geo/timezone", authAPI.RequireUser(geo.Timezone))

	internalBilling := v1.InternalBillingAPI{
		DB:     deps.DB,
		Stripe: stripeClient,
		Secret: deps.Config.InternalCronSecret,
	}
	mux.HandleFunc("POST /v1/internal/billing/authorize-pending", internalBilling.AuthorizePending)

	internalEmail := v1.InternalEmailAPI{
		DB:          deps.DB,
		Email:       emailClient,
		Secret:      deps.Config.InternalCronSecret,
		FrontendURL: deps.Config.FrontendURL,
	}
	mux.HandleFunc("POST /v1/internal/email/pickup-reminders", internalEmail.SendPickupReminders)

	return withLogging(withCORS(deps.Config, mux))
}
