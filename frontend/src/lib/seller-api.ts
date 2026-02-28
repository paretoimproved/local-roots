import { requestJSON } from "@/lib/http";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type SellerStore = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerPickupLocation = {
  id: string;
  label: string | null;
  address1: string;
  address2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  timezone: string;
  photo_url?: string | null;
};

export type SellerPickupWindow = {
  id: string;
  start_at: string;
  end_at: string;
  cutoff_at: string;
  status: string;
  notes: string | null;
  pickup_location: SellerPickupLocation;
  created_at: string;
  updated_at: string;
};

export type SellerSubscriptionPlan = {
  id: string;
  store_id: string;
  pickup_location_id: string;
  product_id: string;
  title: string;
  description: string | null;
  image_url?: string | null;
  cadence: string;
  price_cents: number;
  subscriber_limit: number;
  first_start_at: string;
  duration_minutes: number;
  cutoff_hours: number;
  is_active: boolean;
  is_live: boolean;
  deposit_cents: number;
  created_at: string;
  updated_at: string;
  next_start_at: string;
  pickup_location: SellerPickupLocation;
};

export type SellerProduct = {
  id: string;
  title: string;
  description: string | null;
  unit: string;
  is_perishable: boolean;
  is_active: boolean;
};

export type SellerOffering = {
  id: string;
  pickup_window_id: string;
  product_id: string;
  price_cents: number;
  quantity_available: number;
  quantity_reserved: number;
  status: string;
  product: SellerProduct;
};

export type SellerOrderItem = {
  id: string;
  offering_id: string | null;
  product_title: string;
  product_unit: string;
  price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type SellerOrder = {
  id: string;
  store_id: string;
  pickup_window_id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal_cents: number;
  buyer_fee_cents: number;
  total_cents: number;
  captured_cents: number;
  created_at: string;
  items: SellerOrderItem[];
};

export type SellerPayoutSummary = {
  store_id: string;
  pickup_window_id: string;
  seller_payout_cents: number;
  platform_fee_cents: number;
  gross_captured_cents: number;
  picked_up_count: number;
  no_show_count: number;
  canceled_count: number;
  open_count: number;
  payout_picked_up_cents: number;
  payout_no_show_cents: number;
};

export type PlacesAutocompletePrediction = {
  place_id: string;
  main_text: string;
  secondary_text: string;
  full_text: string;
};

export type PlacesAutocompleteResponse = {
  predictions: PlacesAutocompletePrediction[];
};

export type PlacesDetailsResponse = {
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  formatted_address: string;
  lat: number | null;
  lng: number | null;
};

export type TimezoneResponse = {
  time_zone_id: string;
};

export type PickupPreviewResponse = {
  order_id: string;
  store_id: string;
  store_name: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string;
  items: SellerOrderItem[];
  subtotal_cents: number;
  buyer_fee_cents: number;
  total_cents: number;
  payment_status: string;
  pickup_window_id: string;
  created_at: string;
  updated_at: string;
};

export type PickupConfirmResponse = {
  order_id: string;
  store_id: string;
  pickup_window_id: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string;
  items: SellerOrderItem[];
  total_cents: number;
  subtotal_cents: number;
  confirmed_at: string;
};

export type RevenueByCycle = {
  cycle_date: string;
  revenue_cents: number;
  orders: number;
  pickups: number;
};

export type StoreAnalytics = {
  active_subscribers: number;
  total_subscribers: number;
  churn_count: number;
  total_revenue_cents: number;
  total_orders: number;
  picked_up_count: number;
  pickup_rate: number;
  revenue_by_cycle: RevenueByCycle[];
};

export type PayoutHistoryEntry = {
  order_id: string;
  pickup_date: string;
  total_cents: number;
  seller_payout_cents: number;
  platform_fee_cents: number;
  status: string;
  transfer_id: string | null;
};

export type BoxPreview = {
  id: string;
  plan_id: string;
  cycle_date: string;
  body: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export const sellerApi = {
  registerSeller: (email: string, password: string, displayName?: string) =>
    requestJSON<AuthResponse>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        display_name: displayName ?? null,
        role: "seller",
      }),
    }),
  login: (email: string, password: string) =>
    requestJSON<AuthResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  listMyStores: (token: string) =>
    requestJSON<SellerStore[]>("/v1/seller/stores", { token }),
  createStore: (
    token: string,
    input: { name: string; description?: string | null; phone?: string | null },
  ) =>
    requestJSON<SellerStore>("/v1/seller/stores", {
      method: "POST",
      token,
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? null,
        phone: input.phone ?? null,
      }),
    }),

  updateStore: (
    token: string,
    storeId: string,
    input: { name?: string; description?: string | null; phone?: string | null; image_url?: string | null },
  ) =>
    requestJSON<SellerStore>(`/v1/seller/stores/${storeId}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(input),
    }),

  listPickupLocations: (token: string, storeId: string) =>
    requestJSON<SellerPickupLocation[]>(
      `/v1/seller/stores/${storeId}/pickup-locations`,
      { token },
    ),
  createPickupLocation: (
    token: string,
    storeId: string,
    input: {
      label?: string | null;
      address1: string;
      address2?: string | null;
      city: string;
      region: string;
      postal_code: string;
      country?: string;
      timezone: string;
      lat?: number | null;
      lng?: number | null;
    },
  ) =>
    requestJSON<SellerPickupLocation>(
      `/v1/seller/stores/${storeId}/pickup-locations`,
      {
        method: "POST",
        token,
        body: JSON.stringify({
          label: input.label ?? null,
          address1: input.address1,
          address2: input.address2 ?? null,
          city: input.city,
          region: input.region,
          postal_code: input.postal_code,
          country: input.country ?? "US",
          timezone: input.timezone,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
        }),
      },
    ),
  deletePickupLocation: (token: string, storeId: string, pickupLocationId: string) =>
    requestJSON<{ deleted: boolean }>(
      `/v1/seller/stores/${storeId}/pickup-locations/${pickupLocationId}`,
      { method: "DELETE", token },
    ),
  updatePickupLocation: (
    token: string,
    storeId: string,
    locationId: string,
    input: {
      label?: string | null;
      address1?: string;
      address2?: string | null;
      city?: string;
      region?: string;
      postal_code?: string;
      country?: string;
      timezone?: string;
      lat?: number | null;
      lng?: number | null;
      photo_url?: string | null;
    },
  ) =>
    requestJSON<SellerPickupLocation>(
      `/v1/seller/stores/${storeId}/pickup-locations/${locationId}`,
      { method: "PATCH", token, body: JSON.stringify(input) },
    ),

  timezoneForLatLng: (token: string, lat: number, lng: number) =>
    requestJSON<TimezoneResponse>(`/v1/seller/geo/timezone`, {
      method: "POST",
      token,
      body: JSON.stringify({ lat, lng }),
    }),

  listPickupWindows: (token: string, storeId: string) =>
    requestJSON<SellerPickupWindow[]>(
      `/v1/seller/stores/${storeId}/pickup-windows`,
      { token },
    ),
  createPickupWindow: (
    token: string,
    storeId: string,
    input: {
      pickup_location_id: string;
      start_at: string;
      end_at: string;
      cutoff_at: string;
      status?: string;
      notes?: string | null;
    },
  ) =>
    requestJSON<SellerPickupWindow>(
      `/v1/seller/stores/${storeId}/pickup-windows`,
      { method: "POST", token, body: JSON.stringify(input) },
    ),

  listProducts: (token: string, storeId: string) =>
    requestJSON<SellerProduct[]>(`/v1/seller/stores/${storeId}/products`, {
      token,
    }),
  createProduct: (
    token: string,
    storeId: string,
    input: {
      title: string;
      unit: string;
      description?: string | null;
      is_perishable?: boolean;
      is_active?: boolean;
    },
  ) =>
    requestJSON<SellerProduct>(`/v1/seller/stores/${storeId}/products`, {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),

  listOfferings: (token: string, storeId: string, pickupWindowId: string) =>
    requestJSON<SellerOffering[]>(
      `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/offerings`,
      { token },
    ),
  createOffering: (
    token: string,
    storeId: string,
    pickupWindowId: string,
    input: {
      product_id: string;
      price_cents: number;
      quantity_available: number;
      status?: string;
    },
  ) =>
    requestJSON<SellerOffering>(
      `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/offerings`,
      { method: "POST", token, body: JSON.stringify(input) },
    ),

  listOrders: (token: string, storeId: string, pickupWindowId: string) =>
    requestJSON<SellerOrder[]>(
      `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/orders`,
      { token },
    ),

  getPayoutSummary: (token: string, storeId: string, pickupWindowId: string) =>
    requestJSON<SellerPayoutSummary>(
      `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/payout-summary`,
      { token },
    ),

  updateOrderStatus: (
    token: string,
    storeId: string,
    orderId: string,
    status: "ready" | "canceled" | "no_show",
    opts?: { waive_fee?: boolean },
  ) =>
    requestJSON<{ id: string; store_id: string; pickup_window_id: string; status: string }>(
      `/v1/seller/stores/${storeId}/orders/${orderId}/status`,
      { method: "POST", token, body: JSON.stringify({ status, waive_fee: opts?.waive_fee ?? false }) },
    ),

  confirmPickup: (token: string, storeId: string, orderId: string, pickupCode: string) =>
    requestJSON<{ id: string; store_id: string; pickup_window_id: string; status: string }>(
      `/v1/seller/stores/${storeId}/orders/${orderId}/confirm-pickup`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ pickup_code: pickupCode }),
      },
    ),

  listSubscriptionPlans: (token: string, storeId: string) =>
    requestJSON<SellerSubscriptionPlan[]>(
      `/v1/seller/stores/${storeId}/subscription-plans`,
      { token },
    ),
  createSubscriptionPlan: (
    token: string,
    storeId: string,
    input: {
      pickup_location_id: string;
      title: string;
      description?: string | null;
      cadence: "weekly" | "biweekly" | "monthly";
      price_cents: number;
      subscriber_limit: number;
      first_start_at_local: string; // "YYYY-MM-DDTHH:MM"
      duration_minutes: number;
      cutoff_hours: number;
      deposit_cents?: number;
    },
  ) =>
    requestJSON<SellerSubscriptionPlan>(
      `/v1/seller/stores/${storeId}/subscription-plans`,
      { method: "POST", token, body: JSON.stringify(input) },
    ),
  updateSubscriptionPlan: (
    token: string,
    storeId: string,
    planId: string,
    input: {
      title?: string;
      description?: string | null;
      price_cents?: number;
      subscriber_limit?: number;
      is_active?: boolean;
      deposit_cents?: number;
      image_url?: string | null;
    },
  ) =>
    requestJSON<SellerSubscriptionPlan>(
      `/v1/seller/stores/${storeId}/subscription-plans/${planId}`,
      { method: "PATCH", token, body: JSON.stringify(input) },
    ),
  generateNextCycle: (token: string, storeId: string, planId: string) =>
    requestJSON<{
      pickup_window_id: string;
      offering_id: string;
      orders_created: number;
      start_at: string;
    }>(`/v1/seller/stores/${storeId}/subscription-plans/${planId}/generate-cycle`, {
      method: "POST",
      token,
      body: JSON.stringify({}),
    }),

  placesAutocomplete: (token: string, input: string, sessionToken: string) =>
    requestJSON<PlacesAutocompleteResponse>("/v1/seller/geo/places/autocomplete", {
      method: "POST",
      token,
      body: JSON.stringify({ input, session_token: sessionToken }),
    }),

  placesDetails: (token: string, placeId: string, sessionToken: string) =>
    requestJSON<PlacesDetailsResponse>("/v1/seller/geo/places/details", {
      method: "POST",
      token,
      body: JSON.stringify({ place_id: placeId, session_token: sessionToken }),
    }),

  pickupPreview: (token: string, orderId: string, code: string) =>
    requestJSON<PickupPreviewResponse>(
      `/v1/seller/pickup/preview?order=${encodeURIComponent(orderId)}&code=${encodeURIComponent(code)}`,
      { token },
    ),
  pickupConfirm: (token: string, orderId: string, code: string) =>
    requestJSON<PickupConfirmResponse>("/v1/seller/pickup/confirm", {
      method: "POST",
      token,
      body: JSON.stringify({ order_id: orderId, pickup_code: code }),
    }),

  // Stripe Connect
  connectOnboard: (token: string, storeId: string) =>
    requestJSON<{ url: string; account_id: string }>(
      `/v1/seller/stores/${storeId}/connect/onboard`,
      { method: "POST", token, body: JSON.stringify({}) },
    ),
  connectStatus: (token: string, storeId: string) =>
    requestJSON<{ status: string }>(
      `/v1/seller/stores/${storeId}/connect/status`,
      { token },
    ),
  connectRefreshLink: (token: string, storeId: string) =>
    requestJSON<{ url: string }>(
      `/v1/seller/stores/${storeId}/connect/refresh-link`,
      { method: "POST", token, body: JSON.stringify({}) },
    ),
  connectAccountSession: (token: string, storeId: string) =>
    requestJSON<{ client_secret: string }>(
      `/v1/seller/stores/${storeId}/connect/account-session`,
      { method: "POST", token, body: JSON.stringify({}) },
    ),

  // Box previews
  listBoxPreviews: (token: string, storeId: string, planId: string) =>
    requestJSON<BoxPreview[]>(
      `/v1/seller/stores/${storeId}/plans/${planId}/previews`,
      { token },
    ),
  createBoxPreview: (
    token: string,
    storeId: string,
    planId: string,
    input: { cycle_date: string; body: string; photo_url?: string | null },
  ) =>
    requestJSON<BoxPreview>(
      `/v1/seller/stores/${storeId}/plans/${planId}/previews`,
      { method: "POST", token, body: JSON.stringify(input) },
    ),
  deleteBoxPreview: (token: string, storeId: string, planId: string, previewId: string) =>
    requestJSON<{ deleted: boolean }>(
      `/v1/seller/stores/${storeId}/plans/${planId}/previews/${previewId}`,
      { method: "DELETE", token },
    ),

  getStoreAnalytics: (token: string, storeId: string) =>
    requestJSON<StoreAnalytics>(
      `/v1/seller/stores/${storeId}/analytics`,
      { token },
    ),
  getPayoutHistory: (token: string, storeId: string) =>
    requestJSON<PayoutHistoryEntry[]>(
      `/v1/seller/stores/${storeId}/payouts`,
      { token },
    ),
};
