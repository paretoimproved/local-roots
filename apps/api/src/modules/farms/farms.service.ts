import { db, eq, and, desc, farms, newId, type Farm, type NewFarm } from "@repo/db";
import { ilike, lt, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const farmService = {
  // Get all farms with cursor pagination
  async getFarms(cursor?: string, limit: number = 20, search?: string) {
    let query = db.select().from(farms).orderBy(desc(farms.createdAt), desc(farms.id)).limit(limit + 1);
    const whereConditions: SQL[] = [];

    if (cursor) {
      // Decode cursor to get createdAt and id
      const decodedCursor = this.decodeCursor(cursor);
      if (decodedCursor) {
        const { createdAt, id } = decodedCursor;
        // Cursor pagination: get items before the cursor (since we order DESC)
        whereConditions.push(
          or(
            lt(farms.createdAt, createdAt),
            and(
              eq(farms.createdAt, createdAt),
              lt(farms.id, id)
            )
          )
        );
      }
    }

    if (search && search.trim().length > 0) {
      const normalizedSearch = `%${search.trim()}%`;
      whereConditions.push(
        or(
          ilike(farms.name, normalizedSearch),
          ilike(farms.city, normalizedSearch),
          ilike(farms.state, normalizedSearch),
          ilike(farms.description, normalizedSearch)
        )
      );
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const results = await query;
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    
    let nextCursor = null;
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = this.encodeCursor(lastItem.createdAt!, lastItem.id);
    }
    
    return {
      data,
      nextCursor,
      hasMore
    };
  },

  // Get all farms (legacy method for backwards compatibility)
  async getAllFarms() {
    return db.select().from(farms);
  },

  // Encode cursor for pagination
  encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
  },

  // Decode cursor for pagination
  decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const [createdAtStr, id] = decoded.split('|');
      return {
        createdAt: new Date(createdAtStr),
        id
      };
    } catch {
      return null;
    }
  },

  // Get farms by user ID
  async getFarmsByUserId(userId: string) {
    return db.select().from(farms).where(eq(farms.userId, userId));
  },

  // Get a farm by ID
  async getFarmById(id: string) {
    const result = await db.select().from(farms).where(eq(farms.id, id));
    return result[0] || null;
  },

  // Create a new farm
  async createFarm(data: Omit<NewFarm, "id" | "userId">, userId: string) {
    const farmId = newId("farm");
    const result = await db
      .insert(farms)
      .values({
        id: farmId,
        userId,
        ...data,
      })
      .returning();
    return result[0];
  },

  // Update a farm
  async updateFarm(id: string, data: Partial<Omit<Farm, "id" | "userId">>) {
    const result = await db
      .update(farms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(farms.id, id))
      .returning();
    return result[0];
  },

  // Delete a farm
  async deleteFarm(id: string) {
    await db.delete(farms).where(eq(farms.id, id));
    return { success: true };
  },
};
