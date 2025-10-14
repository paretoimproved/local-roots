import { db, eq, and, csaShares, farms, newId, type CsaShare, type NewCsaShare } from "@repo/db";
import { inArray } from "drizzle-orm";

export const sharesService = {
  // Get all shares
  async getAllShares() {
    return db.select().from(csaShares);
  },

  // Get shares by farm ID
  async getSharesByFarmId(farmId: string) {
    return db.select().from(csaShares).where(eq(csaShares.farmId, farmId));
  },

  // Get shares by user ID (all shares from all farms owned by the user)
  async getSharesByUserId(userId: string) {
    const userFarms = await db.select({ id: farms.id }).from(farms).where(eq(farms.userId, userId));
    const farmIds = userFarms.map(farm => farm.id);
    
    if (farmIds.length === 0) {
      return [];
    }
    
    return db
      .select()
      .from(csaShares)
      .where(inArray(csaShares.farmId, farmIds));
  },
  
  // Get a share by ID
  async getShareById(id: string) {
    const result = await db.select().from(csaShares).where(eq(csaShares.id, id));
    return result[0] || null;
  },

  // Create a new share for a farm
  async createShare(data: Omit<NewCsaShare, "id">) {
    const shareId = newId("share");
    const result = await db
      .insert(csaShares)
      .values({
        id: shareId,
        ...data,
      })
      .returning();
    return result[0];
  },

  // Update a share
  async updateShare(id: string, data: Partial<Omit<CsaShare, "id">>) {
    const result = await db
      .update(csaShares)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(csaShares.id, id))
      .returning();
    return result[0];
  },

  // Delete a share
  async deleteShare(id: string) {
    await db.delete(csaShares).where(eq(csaShares.id, id));
    return { success: true };
  },

  // Toggle share availability
  async toggleAvailability(id: string, available: boolean) {
    const result = await db
      .update(csaShares)
      .set({ 
        available,
        updatedAt: new Date() 
      })
      .where(eq(csaShares.id, id))
      .returning();
    return result[0];
  },

  // Check if share belongs to user (via farm ownership)
  async checkShareOwnership(shareId: string, userId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(csaShares)
      .innerJoin(farms, eq(csaShares.farmId, farms.id))
      .where(
        and(
          eq(csaShares.id, shareId),
          eq(farms.userId, userId)
        )
      );
    
    return result.length > 0;
  }
}; 
