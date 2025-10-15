import apiClient from "./client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const USE_DEMO_DATA = process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

const STATE_ABBR_TO_FULL: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

// Types
export type Farm = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  imageUrls?: string[];
  categories?: string[];
  pricePerWeek?: number;
  deliveryOptions?: string[];
  rating?: number;
  distanceMiles?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateFarmInput = {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  imageUrls?: string[];
  categories?: string[];
  pricePerWeek?: number;
  deliveryOptions?: string[];
  rating?: number;
  distanceMiles?: number;
};

export type GetFarmsParams = {
  cursor?: string;
  limit?: number;
  search?: string;
  category?: string;
  priceTier?: string;
  delivery?: string;
  minRating?: number;
  sort?: string;
};

const buildUrl = (path: string) => (API_BASE_URL ? `${API_BASE_URL}${path}` : path);

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
};

// Fetch farms with pagination and search
export async function getFarms(params: GetFarmsParams = {}): Promise<PaginatedResponse<Farm>> {
  if (USE_DEMO_DATA) {
    const res = await fetch("/demo/farms.json");
    const farms = (await res.json()) as Farm[];

    const limit = params.limit ?? 20;
    const searchTerm = params.search?.toLowerCase().trim();
    const rawOffset = params.cursor ? Number(params.cursor) : 0;
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

    const filtered = searchTerm
      ? farms.filter((farm) => {
          const term = searchTerm.toLowerCase();
          const isStateAbbr = term.length === 2 && /^[a-z]{2}$/.test(term);

          const farmState = farm.state?.toLowerCase() ?? '';
          if (isStateAbbr) {
            return farmState === term;
          }

          const stateFull = STATE_ABBR_TO_FULL[farm.state?.toUpperCase() ?? '']?.toLowerCase() ?? '';
          const fields = [
            farm.name?.toLowerCase() ?? '',
            farm.city?.toLowerCase() ?? '',
            stateFull,
            (farm.categories ?? []).join(' ').toLowerCase(),
            farm.zipCode ?? ''
          ];

          return fields.some((field) => field.includes(term));
        })
      : farms;

    const filteredByCategory = params.category && params.category !== 'all'
      ? filtered.filter((farm) => {
          const categories = farm.categories?.map((c) => c.toLowerCase()) ?? [];
          return categories.includes(params.category!.toLowerCase());
        })
      : filtered;

    const filteredByPrice = (() => {
      if (!params.priceTier || params.priceTier === 'all') return filteredByCategory;
      return filteredByCategory.filter((farm) => {
        const price = farm.pricePerWeek ?? Infinity;
        if (params.priceTier === 'under-30') return price < 30;
        if (params.priceTier === '30-40') return price >= 30 && price <= 40;
        if (params.priceTier === '40-plus') return price > 40;
        return true;
      });
    })();

    const filteredByDelivery = params.delivery && params.delivery !== 'all'
      ? filteredByPrice.filter((farm) => farm.deliveryOptions?.includes(params.delivery!))
      : filteredByPrice;

    const filteredByRating = typeof params.minRating === 'number'
      ? filteredByDelivery.filter((farm) => (farm.rating ?? 5) >= params.minRating!)
      : filteredByDelivery;

    const sorted = (() => {
      const list = [...filteredByRating];
      switch (params.sort) {
        case 'rating':
          return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        case 'price':
          return list.sort((a, b) => (a.pricePerWeek ?? Infinity) - (b.pricePerWeek ?? Infinity));
        case 'name':
          return list.sort((a, b) => a.name.localeCompare(b.name));
        case 'distance':
        default:
          return list.sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
      }
    })();

    const sliceStart = Math.min(offset, sorted.length);
    const sliceEnd = Math.min(sliceStart + limit, sorted.length);
    const paged = sorted.slice(sliceStart, sliceEnd);
    const nextCursor = sliceEnd < sorted.length ? String(sliceEnd) : null;

    return {
      success: true,
      data: paged,
      nextCursor,
      hasMore: nextCursor !== null,
    };
  }

  const searchParams = new URLSearchParams();
  
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.priceTier) searchParams.set('price', params.priceTier);
  if (params.delivery) searchParams.set('delivery', params.delivery);
  if (typeof params.minRating === 'number') searchParams.set('rating', params.minRating.toString());
  if (params.sort && params.sort !== 'distance') searchParams.set('sort', params.sort);
  
  const url = buildUrl(`/farms${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching farms:', error);
    throw error;
  }
}

// Fetch a farm by ID
export async function getFarm(id: string): Promise<Farm> {
  try {
    const response = await fetch(buildUrl(`/farms/${id}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching farm:', error);
    throw error;
  }
}

// Fetch farms for the current user  
export async function getMyFarms(): Promise<{ success: boolean; data: Farm[] }> {
  try {
    const response = await fetch(buildUrl('/farms/user/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user farms:', error);
    throw error;
  }
}

// Create a new farm
export async function createFarm(data: CreateFarmInput): Promise<Farm> {
  const response = await apiClient.farms.create(data);
  return response.json();
}

// Update a farm
export async function updateFarm(id: string, data: Partial<CreateFarmInput>): Promise<Farm> {
  const response = await apiClient.farms.update(id, data);
  return response.json();
}

// Delete a farm
export async function deleteFarm(id: string): Promise<{ success: boolean }> {
  const response = await apiClient.farms.delete(id);
  return response.json();
} 
