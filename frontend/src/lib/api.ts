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

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    // Keep dev behavior simple and predictable for now.
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const api = {
  listStores: () => getJSON<Store[]>("/v1/stores"),
  listStorePickupWindows: (storeId: string) =>
    getJSON<PickupWindow[]>(`/v1/stores/${storeId}/pickup-windows`),
  listPickupWindowOfferings: (pickupWindowId: string) =>
    getJSON<Offering[]>(`/v1/pickup-windows/${pickupWindowId}/offerings`),
};

