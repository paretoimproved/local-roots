import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { farmService } from "./farms.service";
import { farmInsertSchema } from "@repo/db";
import { auth, getUserId, requireAuth } from "../../pkg/middleware/clerk-auth";
import { z } from "zod";

// Pagination query schema
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20)
});

// Create farms routes
export const farmRoutes = new Hono()
  // Get all farms with pagination (public)
  .get("/", zValidator("query", paginationSchema), async (c) => {
    const { cursor, limit } = c.req.valid("query");
    
    try {
      const result = await farmService.getFarms(cursor, limit);
      return c.json({
        success: true,
        data: result.data,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore
      });
    } catch (error) {
      console.error('Error fetching farms:', error);
      return c.json(
        { 
          success: false, 
          error: 'Failed to fetch farms',
          data: [],
          nextCursor: null,
          hasMore: false
        }, 
        500
      );
    }
  })

  // Get farm by ID (public)
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const farm = await farmService.getFarmById(id);
    
    if (!farm) {
      return c.json({ error: "Farm not found" }, 404);
    }
    
    return c.json(farm);
  })
  
  // Protected routes requiring authentication
  .use("/*", auth())
  
  // Get farms for the authenticated user
  .get("/user/me", async (c) => {
    const userId = getUserId(c);
    const farms = await farmService.getFarmsByUserId(userId);
    return c.json({
      success: true,
      data: farms
    });
  })
  
  // Create a new farm
  .post("/", zValidator("json", farmInsertSchema), async (c) => {
    const data = c.req.valid("json");
    const userId = getUserId(c);
    
    const farm = await farmService.createFarm(data, userId);
    return c.json(farm, 201);
  })
  
  // Update a farm
  .put("/:id", zValidator("json", farmInsertSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const userId = getUserId(c);
    
    // Check if the farm exists and belongs to the user
    const existingFarm = await farmService.getFarmById(id);
    if (!existingFarm) {
      return c.json({ error: "Farm not found" }, 404);
    }
    
    if (existingFarm.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const updatedFarm = await farmService.updateFarm(id, data);
    return c.json(updatedFarm);
  })
  
  // Delete a farm
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const userId = getUserId(c);
    
    // Check if the farm exists and belongs to the user
    const existingFarm = await farmService.getFarmById(id);
    if (!existingFarm) {
      return c.json({ error: "Farm not found" }, 404);
    }
    
    if (existingFarm.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    await farmService.deleteFarm(id);
    return c.json({ success: true });
  }); 