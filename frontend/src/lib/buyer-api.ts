import type { Offering } from "@/lib/api";
import { requestJSON } from "@/lib/http";

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

export type Subscription = {
  id: string;
  plan_id: string;
  store_id: string;
  buyer_token: string;
  status: string;
  created_at: string;
};

export type SubscribeResponse = {
  subscription: Subscription;
  first_order: Order;
};

export type PlanCheckoutResponse = {
  payment_intent_id: string;
  client_secret: string;
};

export type GetOrderResponse = {
  order: Order;
  has_review: boolean;
};

export const buyerApi = {
  placeOrder: (pickupWindowId: string, input: CreateOrderInput) =>
    requestJSON<Order>(`/v1/pickup-windows/${pickupWindowId}/orders`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getOrder: (orderId: string, token: string) =>
    requestJSON<GetOrderResponse>(`/v1/orders/${orderId}`, {
      method: "GET",
      token,
    }),

  subscribeToPlan: (
    planId: string,
    input: {
      buyer: { email: string; name?: string | null; phone?: string | null };
      payment_intent_id: string;
    },
  ) =>
    requestJSON<SubscribeResponse>(`/v1/subscription-plans/${planId}/subscribe`, {
      method: "POST",
      body: JSON.stringify({
        payment_intent_id: input.payment_intent_id,
        buyer: {
          email: input.buyer.email,
          name: input.buyer.name ?? null,
          phone: input.buyer.phone ?? null,
        },
      }),
    }),

  checkoutPlan: (
    planId: string,
    input: { buyer: { email: string; name?: string | null; phone?: string | null } },
  ) =>
    requestJSON<PlanCheckoutResponse>(`/v1/subscription-plans/${planId}/checkout`, {
      method: "POST",
      body: JSON.stringify({
        buyer: {
          email: input.buyer.email,
          name: input.buyer.name ?? null,
          phone: input.buyer.phone ?? null,
        },
      }),
    }),

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
