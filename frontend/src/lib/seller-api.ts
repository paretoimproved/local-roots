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
  total_cents: number;
  created_at: string;
  items: SellerOrderItem[];
};

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

async function requestJSON<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

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

  listPickupLocations: (token: string, storeId: string) =>
    requestJSON<SellerPickupLocation[]>(
      `/v1/seller/stores/${storeId}/pickup-locations`,
      { token },
    ),
  createPickupLocation: (
    token: string,
    storeId: string,
    input: Omit<SellerPickupLocation, "id" | "country"> & { country?: string },
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
        }),
      },
    ),

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

  updateOrderStatus: (
    token: string,
    storeId: string,
    orderId: string,
    status: "ready" | "picked_up" | "canceled" | "no_show",
  ) =>
    requestJSON<{ id: string; store_id: string; pickup_window_id: string; status: string }>(
      `/v1/seller/stores/${storeId}/orders/${orderId}/status`,
      { method: "POST", token, body: JSON.stringify({ status }) },
    ),
};
