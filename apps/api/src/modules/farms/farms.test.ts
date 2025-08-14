import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTestApp, mockUsers, mockFarm } from '../../test/helpers';
import { farmsService } from './farms.service';

// Mock the database
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  farms: {},
  eq: vi.fn(),
  newId: vi.fn(() => 'test_farm_id'),
}));

describe('Farms Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFarm', () => {
    it('should create a new farm', async () => {
      // Mock database response
      const mockCreatedFarm = { id: 'test_farm_id', ...mockFarm, userId: mockUsers.farmer.id };
      
      const { db } = await import('@repo/db');
      vi.mocked(db.returning).mockResolvedValue([mockCreatedFarm]);

      const result = await farmsService.createFarm({
        ...mockFarm,
        userId: mockUsers.farmer.id
      });

      expect(result).toEqual(mockCreatedFarm);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(
        farmsService.createFarm({
          userId: mockUsers.farmer.id,
          name: '', // Invalid: empty name
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('getFarmsByUserId', () => {
    it('should return farms for a specific user', async () => {
      const mockFarms = [
        { id: 'farm1', ...mockFarm, userId: mockUsers.farmer.id },
        { id: 'farm2', ...mockFarm, userId: mockUsers.farmer.id }
      ];

      const { db } = await import('@repo/db');
      vi.mocked(db.where).mockResolvedValue(mockFarms);

      const result = await farmsService.getFarmsByUserId(mockUsers.farmer.id);

      expect(result).toEqual(mockFarms);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return empty array for user with no farms', async () => {
      const { db } = await import('@repo/db');
      vi.mocked(db.where).mockResolvedValue([]);

      const result = await farmsService.getFarmsByUserId('nonexistent_user');

      expect(result).toEqual([]);
    });
  });
});

// API Route Tests would go here if we had route setup
// describe('Farms API Routes', () => { ... });