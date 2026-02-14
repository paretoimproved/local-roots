package httpx

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	v1 "github.com/paretoimproved/local-roots/backend/internal/api/v1"
	"github.com/paretoimproved/local-roots/backend/internal/config"
	"github.com/paretoimproved/local-roots/backend/internal/health"
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

	public := v1.PublicAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/stores", public.ListStores)
	mux.HandleFunc("GET /v1/stores/{storeId}/pickup-windows", public.ListStorePickupWindows)
	mux.HandleFunc("GET /v1/pickup-windows/{pickupWindowId}/offerings", public.ListPickupWindowOfferings)

	orders := v1.OrdersAPI{DB: deps.DB}
	mux.HandleFunc("POST /v1/pickup-windows/{pickupWindowId}/orders", orders.CreateOrder)

	buyerOrders := v1.BuyerOrdersAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/orders/{orderId}", buyerOrders.GetOrder)
	mux.HandleFunc("POST /v1/orders/{orderId}/review", buyerOrders.CreateReview)

	authAPI := v1.AuthAPI{DB: deps.DB, JWTSecret: deps.Config.JWTSecret}
	mux.HandleFunc("POST /v1/auth/register", authAPI.Register)
	mux.HandleFunc("POST /v1/auth/login", authAPI.Login)

	seller := v1.SellerAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/seller/stores", authAPI.RequireUser(seller.ListMyStores))
	mux.HandleFunc("POST /v1/seller/stores", authAPI.RequireUser(seller.CreateStore))
	mux.HandleFunc("PATCH /v1/seller/stores/{storeId}", authAPI.RequireUser(seller.UpdateStore))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-locations", authAPI.RequireUser(seller.ListPickupLocations))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-locations", authAPI.RequireUser(seller.CreatePickupLocation))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows", authAPI.RequireUser(seller.ListPickupWindows))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-windows", authAPI.RequireUser(seller.CreatePickupWindow))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/products", authAPI.RequireUser(seller.ListProducts))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/products", authAPI.RequireUser(seller.CreateProduct))

	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/offerings", authAPI.RequireUser(seller.ListOfferings))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/offerings", authAPI.RequireUser(seller.CreateOffering))

	sellerOrders := v1.SellerOrdersAPI{DB: deps.DB}
	mux.HandleFunc("GET /v1/seller/stores/{storeId}/pickup-windows/{pickupWindowId}/orders", authAPI.RequireUser(sellerOrders.ListOrdersForPickupWindow))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/{orderId}/status", authAPI.RequireUser(sellerOrders.UpdateOrderStatus))
	mux.HandleFunc("POST /v1/seller/stores/{storeId}/orders/{orderId}/confirm-pickup", authAPI.RequireUser(sellerOrders.ConfirmPickup))

	return withCORS(deps.Config, mux)
}
