import { apiClient } from "./client";

// Types
export type CSAShare = {
  id: string;
  farmId: string;
  name: string;
  description?: string;
  price: number;
  frequency: string;
  available: boolean;
  startDate?: string;
  endDate?: string;
  maxSubscribers: number;
  currentSubscribers: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCSAShareInput = {
  farmId: string;
  name: string;
  description?: string;
  price: number;
  frequency: string;
  available: boolean;
  startDate?: string;
  endDate?: string;
  maxSubscribers: number;
};

// Get all CSA shares
export const getAllShares = async (): Promise<CSAShare[]> => {
  const response = await apiClient.shares.getAll();
  return response.json();
};

// Get a CSA share by ID
export const getShareById = async (id: string): Promise<CSAShare> => {
  const response = await apiClient.shares.getById(id);
  return response.json();
};

// Previous function name for backwards compatibility
export const getShare = getShareById;

// Get CSA shares for a specific farm
export const getSharesByFarmId = async (farmId: string): Promise<CSAShare[]> => {
  const response = await apiClient.shares.getByFarmId(farmId);
  return response.json();
};

// Get CSA shares for the current user's farms
export const getMyShares = async (): Promise<CSAShare[]> => {
  const response = await apiClient.shares.getMyShares();
  return response.json();
};

// Create a new CSA share
export const createShare = async (data: CreateCSAShareInput): Promise<CSAShare> => {
  const response = await apiClient.shares.create(data);
  return response.json();
};

// Update a CSA share
export const updateShare = async (id: string, data: Partial<CSAShare>): Promise<CSAShare> => {
  const response = await apiClient.shares.update(id, data);
  return response.json();
};

// Set a share's availability
export const setShareAvailability = async (id: string, available: boolean): Promise<CSAShare> => {
  const response = await apiClient.shares.setAvailability(id, available);
  return response.json();
};

// Delete a CSA share
export const deleteShare = async (id: string): Promise<void> => {
  await apiClient.shares.delete(id);
}; 