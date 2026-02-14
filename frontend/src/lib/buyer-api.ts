import type { Offering } from "@/lib/api";

export type CreateOrderInput = {
  buyer: {
    email: string;
    name?: string | null;
    phone?: string | null;
  };
  items: Array<{
    offering_id: string;
    quantity: number;
  }>;
};

export type OrderItem = {
  id: string;
  offering_id: string | null;
  product_title: string;
  product_unit: string;
  price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type Order = {
  id: string;
  store_id: string;
  pickup_window_id: string;
  buyer_token: string;
  pickup_code: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
  items: OrderItem[];
};

export type GetOrderResponse = {
  order: Order;
  has_review: boolean;
};

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

async function requestJSON<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const buyerApi = {
  placeOrder: (pickupWindowId: string, input: CreateOrderInput) =>
    requestJSON<Order>(`/v1/pickup-windows/${pickupWindowId}/orders`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getOrder: (orderId: string, token: string) =>
    requestJSON<GetOrderResponse>(
      `/v1/orders/${orderId}?token=${encodeURIComponent(token)}`,
      { method: "GET" },
    ),

  createReview: (
    orderId: string,
    input: { token: string; rating: number; body?: string | null },
  ) =>
    requestJSON<{
      id: string;
      order_id: string;
      store_id: string;
      rating: number;
      body: string | null;
      created_at: string;
    }>(`/v1/orders/${orderId}/review`, {
      method: "POST",
      body: JSON.stringify({
        token: input.token,
        rating: input.rating,
        body: input.body ?? null,
      }),
    }),
};

export function defaultItemQty(offerings: Offering[]) {
  const out: Record<string, number> = {};
  for (const o of offerings) out[o.id] = 0;
  return out;
}
