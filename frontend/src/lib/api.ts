import { requestJSON } from "@/lib/http";

export type Store = {
  id: string;
  name: string;
  description: string | null;
  image_url?: string | null;
  created_at: string;
  city?: string | null;
  region?: string | null;
  distance_km?: number | null;
  is_demo?: boolean;
  next_pickup_date?: string | null;
};

export type PickupLocation = {
  id: string;
  label: string | null;
  address1: string;
  city: string;
  region: string;
  postal_code: string;
  timezone: string;
  lat?: number | null;
  lng?: number | null;
  instructions?: string | null;
  photo_url?: string | null;
};

export type PickupWindowDetail = {
  id: string;
  store_id: string;
  store_name: string;
  start_at: string;
  end_at: string;
  status: string;
  pickup_location: {
    label: string | null;
    address1: string;
    city: string;
    region: string;
    timezone: string;
  };
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
  image_url?: string | null;
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
  image_url?: string | null;
  cadence: "weekly" | "biweekly" | "monthly" | string;
  price_cents: number;
  subscriber_limit: number;
  first_start_at: string;
  duration_minutes: number;
  cutoff_hours: number;
  is_active: boolean;
  is_live: boolean;
  deposit_cents: number;
  next_start_at: string;
  pickup_location: PickupLocation;
};

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
};

export type ReviewsResponse = {
  avg_rating: number;
  review_count: number;
  reviews: PublicReview[];
};

export type PlacePrediction = {
  place_id: string;
  label: string;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export type BoxPreviewPublic = {
  id: string;
  plan_id: string;
  cycle_date: string;
  body: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export const api = {
  placesAutocomplete: (q: string) =>
    requestJSON<PlacePrediction[]>(
      `/v1/places/autocomplete?q=${encodeURIComponent(q)}`,
      { method: "GET", cache: "no-store" },
    ),
  geocode: (opts: { q?: string; place_id?: string }) => {
    const params = new URLSearchParams();
    if (opts.place_id) params.set("place_id", opts.place_id);
    else if (opts.q) params.set("q", opts.q);
    return requestJSON<GeocodeResult>(`/v1/geocode?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });
  },
  listStores: (opts?: { lat?: number; lng?: number; radius_km?: number; demo?: boolean; token?: string }) => {
    const params = new URLSearchParams();
    if (opts?.lat != null) params.set("lat", String(opts.lat));
    if (opts?.lng != null) params.set("lng", String(opts.lng));
    if (opts?.radius_km != null) params.set("radius_km", String(opts.radius_km));
    if (opts?.demo) params.set("demo", "true");
    const qs = params.toString();
    return requestJSON<Store[]>(`/v1/stores${qs ? `?${qs}` : ""}`, {
      method: "GET",
      ...(opts?.token ? { token: opts.token } : {}),
      ...(qs ? { cache: "no-store" as const } : { next: { revalidate: 30 } }),
    });
  },
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
  listStoreReviews: (storeId: string) =>
    requestJSON<ReviewsResponse>(`/v1/stores/${storeId}/reviews`, {
      method: "GET",
      next: { revalidate: 60 },
    }),
  getStore: (storeId: string) =>
    requestJSON<Store>(`/v1/stores/${storeId}`, {
      method: "GET",
      next: { revalidate: 30 },
    }),
  getPickupWindow: (pickupWindowId: string) =>
    requestJSON<PickupWindowDetail>(`/v1/pickup-windows/${pickupWindowId}`, {
      method: "GET",
      next: { revalidate: 30 },
    }),
  getLatestBoxPreview: (planId: string) =>
    requestJSON<BoxPreviewPublic>(`/v1/plans/${planId}/preview/latest`, {
      method: "GET",
      cache: "no-store",
    }),
  listCities: () =>
    requestJSON<{ city: string; region: string; slug: string; store_count: number }[]>("/v1/cities", {
      method: "GET",
      next: { revalidate: 300 },
    }),
  joinWaitlist: (email: string, lat?: number, lng?: number) =>
    requestJSON<{ id: string }>("/v1/waitlist", {
      method: "POST",
      body: JSON.stringify({ email, lat, lng }),
    }),
};
