import type { FullConfig } from "@playwright/test";

function getApiUrl(): string {
  return process.env.E2E_API_URL ?? "http://localhost:8080";
}

async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return {} as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export async function registerSeller(
  email: string,
  password: string,
  displayName = "E2E Seller",
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("POST", "/v1/auth/register", {
    email,
    password,
    display_name: displayName,
  });
}

export async function loginSeller(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("POST", "/v1/auth/login", { email, password });
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

interface Store {
  id: string;
  name: string;
  description: string;
}

export async function createStoreViaApi(
  token: string,
  name: string,
  description = "E2E test store",
): Promise<Store> {
  return apiRequest<Store>("POST", "/v1/seller/stores", { name, description }, token);
}

export async function listStoresViaApi(token: string): Promise<Store[]> {
  return apiRequest<Store[]>("GET", "/v1/seller/stores", undefined, token);
}

// ---------------------------------------------------------------------------
// Pickup Locations
// ---------------------------------------------------------------------------

interface PickupLocation {
  id: string;
  label: string;
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  timezone: string;
  lat: number;
  lng: number;
}

export async function createPickupLocationViaApi(
  token: string,
  storeId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<PickupLocation> {
  return apiRequest<PickupLocation>(
    "POST",
    `/v1/seller/stores/${storeId}/pickup-locations`,
    {
      label: "Test Pickup Spot",
      address1: "123 Farm Road",
      city: "Testville",
      region: "CA",
      postal_code: "90210",
      country: "US",
      timezone: "America/Los_Angeles",
      lat: 34.0522,
      lng: -118.2437,
      ...overrides,
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  title: string;
  unit: string;
}

export async function createProductViaApi(
  token: string,
  storeId: string,
  title = "Farm Box Items",
  unit = "each",
): Promise<Product> {
  return apiRequest<Product>(
    "POST",
    `/v1/seller/stores/${storeId}/products`,
    { title, unit },
    token,
  );
}

// ---------------------------------------------------------------------------
// Pickup Windows
// ---------------------------------------------------------------------------

interface PickupWindow {
  id: string;
  start_at: string;
  end_at: string;
  cutoff_at: string;
  status: string;
}

export async function createPickupWindowViaApi(
  token: string,
  storeId: string,
  locationId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<PickupWindow> {
  const now = new Date();
  const startAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const endAt = new Date(startAt.getTime() + 5 * 60 * 60 * 1000); // +5 hours
  const cutoffAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000); // -1 day before start

  return apiRequest<PickupWindow>(
    "POST",
    `/v1/seller/stores/${storeId}/pickup-windows`,
    {
      pickup_location_id: locationId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      cutoff_at: cutoffAt.toISOString(),
      status: "active",
      ...overrides,
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// Offerings
// ---------------------------------------------------------------------------

interface Offering {
  id: string;
  product_id: string;
  price_cents: number;
  quantity_available: number;
}

export async function createOfferingViaApi(
  token: string,
  storeId: string,
  pickupWindowId: string,
  productId: string,
  priceCents = 500,
  quantityAvailable = 20,
): Promise<Offering> {
  return apiRequest<Offering>(
    "POST",
    `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/offerings`,
    {
      product_id: productId,
      price_cents: priceCents,
      quantity_available: quantityAvailable,
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// Subscription Plans
// ---------------------------------------------------------------------------

interface SubscriptionPlan {
  id: string;
  title: string;
  cadence: string;
  price_cents: number;
  subscriber_limit: number;
  is_active: boolean;
  is_live: boolean;
}

export async function createPlanViaApi(
  token: string,
  storeId: string,
  locationId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<SubscriptionPlan> {
  const nextSat = new Date();
  nextSat.setDate(nextSat.getDate() + ((6 - nextSat.getDay() + 7) % 7 || 7));
  nextSat.setHours(10, 0, 0, 0);

  return apiRequest<SubscriptionPlan>(
    "POST",
    `/v1/seller/stores/${storeId}/subscription-plans`,
    {
      title: "Weekly Farm Box",
      cadence: "weekly",
      price_cents: 2500,
      subscriber_limit: 10,
      pickup_location_id: locationId,
      first_start_at: nextSat.toISOString(),
      ...overrides,
    },
    token,
  );
}

// ---------------------------------------------------------------------------
// Cycle Generation
// ---------------------------------------------------------------------------

interface GenerateCycleResponse {
  pickup_window: PickupWindow;
  orders_created: number;
}

export async function generateCycleViaApi(
  token: string,
  storeId: string,
  planId: string,
): Promise<GenerateCycleResponse> {
  return apiRequest<GenerateCycleResponse>(
    "POST",
    `/v1/seller/stores/${storeId}/subscription-plans/${planId}/generate-cycle`,
    {},
    token,
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  status: string;
  total_cents: number;
  pickup_code: string;
  token?: string;
  access_token?: string;
}

interface PlaceOrderResponse {
  order: Order;
  token: string;
}

export async function placeOrderViaApi(
  pickupWindowId: string,
  email: string,
  items: { offering_id: string; quantity: number }[],
  paymentMethod = "pay_at_pickup",
): Promise<PlaceOrderResponse> {
  return apiRequest<PlaceOrderResponse>(
    "POST",
    `/v1/pickup-windows/${pickupWindowId}/orders`,
    { email, items, payment_method: paymentMethod },
  );
}

export async function updateOrderStatusViaApi(
  token: string,
  storeId: string,
  orderId: string,
  status: string,
): Promise<Order> {
  return apiRequest<Order>(
    "POST",
    `/v1/seller/stores/${storeId}/orders/${orderId}/status`,
    { status },
    token,
  );
}

export async function confirmPickupViaApi(
  token: string,
  storeId: string,
  orderId: string,
  pickupCode: string,
): Promise<Order> {
  return apiRequest<Order>(
    "POST",
    `/v1/seller/stores/${storeId}/orders/${orderId}/confirm-pickup`,
    { pickup_code: pickupCode },
    token,
  );
}

export async function getOrderViaApi(orderId: string, accessToken: string): Promise<Order> {
  return apiRequest<Order>("GET", `/v1/orders/${orderId}?t=${accessToken}`);
}

// ---------------------------------------------------------------------------
// Seller Orders (list)
// ---------------------------------------------------------------------------

export async function listOrdersViaApi(
  token: string,
  storeId: string,
  pickupWindowId: string,
): Promise<Order[]> {
  return apiRequest<Order[]>(
    "GET",
    `/v1/seller/stores/${storeId}/pickup-windows/${pickupWindowId}/orders`,
    undefined,
    token,
  );
}

// ---------------------------------------------------------------------------
// Magic Link (DB query)
// ---------------------------------------------------------------------------

export async function getMagicLinkTokenFromDb(email: string): Promise<string> {
  const dbUrl = process.env.E2E_DATABASE_URL;
  if (!dbUrl) throw new Error("E2E_DATABASE_URL is not set — cannot query magic link token");

  // Dynamic import so pg is only required when actually running this test
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT token FROM magic_link_tokens
       WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    if (result.rows.length === 0) {
      throw new Error(`No unused magic link token found for ${email}`);
    }
    return result.rows[0].token as string;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Buyer Auth
// ---------------------------------------------------------------------------

interface BuyerAuthResponse {
  token: string;
}

export async function requestMagicLink(email: string): Promise<void> {
  await apiRequest("POST", "/v1/buyer/auth/magic-link", { email });
}

export async function verifyMagicLink(magicToken: string): Promise<BuyerAuthResponse> {
  return apiRequest<BuyerAuthResponse>("POST", "/v1/buyer/auth/verify", {
    token: magicToken,
  });
}
