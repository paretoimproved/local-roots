import apiClient from "./client";

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
};

export type GetFarmsParams = {
  cursor?: string;
  limit?: number;
  search?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
  const searchParams = new URLSearchParams();
  
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  
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
