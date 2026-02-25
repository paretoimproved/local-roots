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
  stripe_payment_intent_id: string;
  payment_method: string;
};

export type OrderCheckoutResponse = {
  payment_intent_id: string;
  client_secret: string;
  subtotal_cents: number;
  buyer_fee_cents: number;
  buyer_fee_bps: number;
  buyer_fee_flat_cents: number;
  total_cents: number;
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
  subscription_id: string | null;
  buyer_token: string;
  pickup_code: string;
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
  mode: "payment_intent" | "setup_intent";
  id: string;
  client_secret: string;
  subtotal_cents: number;
  buyer_fee_cents: number;
  buyer_fee_bps: number;
  buyer_fee_flat_cents: number;
  total_cents: number;
  deposit_cents: number;
};

export type BuyerSubscription = {
  id: string;
  plan_id: string;
  store_id: string;
  status: string;
  created_at: string;
  plan: {
    title: string;
    cadence: string;
    price_cents: number;
    next_start_at: string;
    pickup_location: {
      timezone: string;
      label: string | null;
      address1: string;
      city: string;
      region: string;
      postal_code: string;
    };
  };
};

export type GetBuyerSubscriptionResponse = {
  subscription: BuyerSubscription;
};

export type GetOrderResponse = {
  order: Order;
  has_review: boolean;
};

export const buyerApi = {
  checkoutOrder: (
    pickupWindowId: string,
    input: {
      buyer: { email: string; name?: string | null; phone?: string | null };
      items: Array<{ offering_id: string; quantity: number }>;
    },
  ) =>
    requestJSON<OrderCheckoutResponse>(
      `/v1/pickup-windows/${pickupWindowId}/checkout`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),

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
      payment_intent_id?: string;
      setup_intent_id?: string;
    },
  ) =>
    requestJSON<SubscribeResponse>(`/v1/subscription-plans/${planId}/subscribe`, {
      method: "POST",
      body: JSON.stringify({
        payment_intent_id: input.payment_intent_id ?? null,
        setup_intent_id: input.setup_intent_id ?? null,
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

  getSubscription: (subscriptionId: string, token: string) =>
    requestJSON<GetBuyerSubscriptionResponse>(`/v1/subscriptions/${subscriptionId}`, {
      method: "GET",
      token,
    }),

  updateSubscriptionStatus: (
    subscriptionId: string,
    input: { token: string; status: "active" | "paused" | "canceled" },
  ) =>
    requestJSON<{ ok: boolean; status: string; note?: string }>(
      `/v1/subscriptions/${subscriptionId}/status`,
      {
        method: "POST",
        token: input.token,
        body: JSON.stringify({ status: input.status }),
      },
    ),

  setupSubscriptionPaymentMethod: (subscriptionId: string, token: string) =>
    requestJSON<{ setup_intent_id: string; client_secret: string }>(
      `/v1/subscriptions/${subscriptionId}/payment-method/setup`,
      {
        method: "POST",
        token,
      },
    ),

  confirmSubscriptionPaymentMethod: (
    subscriptionId: string,
    input: { token: string; setup_intent_id: string },
  ) =>
    requestJSON<{ ok: boolean }>(`/v1/subscriptions/${subscriptionId}/payment-method/confirm`, {
      method: "POST",
      token: input.token,
      body: JSON.stringify({ setup_intent_id: input.setup_intent_id }),
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

export type BuyerAuthUser = {
  id: string;
  email: string;
  role: string;
};

export type BuyerAuthResponse = {
  token: string;
  user: BuyerAuthUser;
};

export type BuyerOrderSummary = {
  id: string;
  store_id: string;
  status: string;
  total_cents: number;
  pickup_code: string;
  product_title: string;
  pickup_start_at: string;
  created_at: string;
};

export type BuyerSubscriptionSummary = {
  id: string;
  plan_id: string;
  store_id: string;
  status: string;
  plan_title: string;
  store_name: string;
  cadence: string;
  price_cents: number;
  created_at: string;
};

export const buyerAuthApi = {
  sendMagicLink: (email: string) =>
    requestJSON<{ ok: boolean }>("/v1/buyer/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verify: (token: string) =>
    requestJSON<BuyerAuthResponse>("/v1/buyer/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  getMe: (token: string) =>
    requestJSON<BuyerAuthUser>("/v1/buyer/me", {
      method: "GET",
      token,
    }),

  listOrders: (token: string) =>
    requestJSON<BuyerOrderSummary[]>("/v1/buyer/orders", {
      method: "GET",
      token,
    }),

  listSubscriptions: (token: string) =>
    requestJSON<BuyerSubscriptionSummary[]>("/v1/buyer/subscriptions", {
      method: "GET",
      token,
    }),
};

export function defaultItemQty(offerings: Offering[]) {
  const out: Record<string, number> = {};
  for (const o of offerings) out[o.id] = 0;
  return out;
}
