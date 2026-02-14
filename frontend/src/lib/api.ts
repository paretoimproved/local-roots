import { requestJSON } from "@/lib/http";

export type Store = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type PickupLocation = {
  id: string;
  label: string | null;
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  timezone: string;
};

export type PickupWindow = {
  id: string;
  start_at: string;
  end_at: string;
  cutoff_at: string;
  status: string;
  pickup_location: PickupLocation;
};

export type Product = {
  id: string;
  title: string;
  unit: string;
  description: string | null;
};

export type Offering = {
  id: string;
  price_cents: number;
  quantity_available: number;
  quantity_reserved: number;
  quantity_remaining: number;
  status: string;
  product: Product;
};

export type SubscriptionPlan = {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  cadence: "weekly" | "biweekly" | "monthly" | string;
  price_cents: number;
  subscriber_limit: number;
  first_start_at: string;
  duration_minutes: number;
  cutoff_hours: number;
  is_active: boolean;
  is_live: boolean;
  next_start_at: string;
  pickup_location: PickupLocation;
};

export const api = {
  listStores: () =>
    requestJSON<Store[]>("/v1/stores", { method: "GET", next: { revalidate: 30 } }),
  listStorePickupWindows: (storeId: string) =>
    requestJSON<PickupWindow[]>(`/v1/stores/${storeId}/pickup-windows`, {
      method: "GET",
      next: { revalidate: 30 },
    }),
  listPickupWindowOfferings: (pickupWindowId: string) =>
    requestJSON<Offering[]>(`/v1/pickup-windows/${pickupWindowId}/offerings`, {
      method: "GET",
      next: { revalidate: 10 },
    }),
  listStoreSubscriptionPlans: (storeId: string) =>
    requestJSON<SubscriptionPlan[]>(
      `/v1/stores/${storeId}/subscription-plans`,
      { method: "GET", next: { revalidate: 30 } },
    ),
  getSubscriptionPlan: (planId: string) =>
    requestJSON<SubscriptionPlan>(`/v1/subscription-plans/${planId}`, {
      method: "GET",
      next: { revalidate: 30 },
    }),
};
