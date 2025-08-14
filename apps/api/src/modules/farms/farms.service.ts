import { db, eq, farms, newId, type Farm, type NewFarm } from "@repo/db";

export const farmService = {
  // Get all farms
  async getFarms() {
    return db.select().from(farms);
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