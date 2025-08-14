import { Hono } from 'hono';
import request from 'supertest';

// Helper to create test app instance
export function createTestApp(app: Hono) {
  return request(app);
}

// Mock user data for tests
export const mockUsers = {
  farmer: {
    id: 'user_farmer_test',
    email: 'farmer@test.com',
    role: 'farmer'
  },
  consumer: {
    id: 'user_consumer_test', 
    email: 'consumer@test.com',
    role: 'consumer'
  }
};

// Mock farm data
export const mockFarm = {
  name: 'Test Farm',
  description: 'A test farm for CSA',
  address: '123 Farm Road',
  city: 'Farmville',
  state: 'CA',
  zipCode: '12345',
  latitude: '37.7749',
  longitude: '-122.4194'
};

// Mock CSA share data
export const mockShare = {
  name: 'Weekly Veggie Box',
  description: 'Fresh seasonal vegetables',
  price: 3500, // $35.00 in cents
  frequency: 'weekly' as const,
  available: true,
  startDate: new Date('2025-03-01'),
  endDate: new Date('2025-11-30'),
  maxSubscribers: 50
};