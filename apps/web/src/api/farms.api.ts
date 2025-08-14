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

// Fetch all farms
export async function getFarms(): Promise<Farm[]> {
  const response = await apiClient.farms.getAll();
  return response.json();
}

// Fetch a farm by ID
export async function getFarm(id: string): Promise<Farm> {
  const response = await apiClient.farms.getById(id);
  return response.json();
}

// Fetch farms for the current user
export async function getMyFarms(): Promise<Farm[]> {
  const response = await apiClient.farms.getMyFarms();
  return response.json();
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