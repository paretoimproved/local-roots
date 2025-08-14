// API Client for the LocalRoots application

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to make API requests
async function fetchApi(
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || 'An error occurred while fetching data');
  }

  return res;
}

// API Client for all endpoints
export const apiClient = {
  // Farms API
  farms: {
    // Get all farms
    getAll: () => fetchApi('/farms'),
    
    // Get a farm by ID
    getById: (id: string) => fetchApi(`/farms/${id}`),
    
    // Get farms owned by the current user
    getMyFarms: () => fetchApi('/farms/me'),
    
    // Create a new farm
    create: (data: any) => fetchApi('/farms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    // Update a farm
    update: (id: string, data: any) => fetchApi(`/farms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    
    // Delete a farm
    delete: (id: string) => fetchApi(`/farms/${id}`, {
      method: 'DELETE',
    }),
  },
  
  // CSA Shares API
  shares: {
    // Get all shares
    getAll: () => fetchApi('/shares'),
    
    // Get a share by ID
    getById: (id: string) => fetchApi(`/shares/${id}`),
    
    // Get shares for a specific farm
    getByFarmId: (farmId: string) => fetchApi(`/shares/farm/${farmId}`),
    
    // Get shares for the current user's farms
    getMyShares: () => fetchApi('/shares/me'),
    
    // Create a new share
    create: (data: any) => fetchApi('/shares', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    // Update a share
    update: (id: string, data: any) => fetchApi(`/shares/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    
    // Set a share's availability
    setAvailability: (id: string, available: boolean) => fetchApi(`/shares/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    }),
    
    // Delete a share
    delete: (id: string) => fetchApi(`/shares/${id}`, {
      method: 'DELETE',
    }),
  },
};

// Export the API client
export default apiClient; 