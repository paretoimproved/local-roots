import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { farmService } from "./farms.service";
import { farmInsertSchema } from "@repo/db";
import { auth, getUserId } from "../../pkg/middleware/clerk-auth";
import { z } from "zod";

// Pagination query schema
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
});

// Create farms routes
const normalizeImageUrls = (imageUrls: unknown): string[] | null | undefined => {
  if (Array.isArray(imageUrls)) {
    return imageUrls;
  }

  if (typeof imageUrls === "string") {
    return [imageUrls];
  }

  if (imageUrls === null) {
    return null;
  }

  return undefined;
};

export const farmRoutes = new Hono()
  // Get all farms with pagination (public)
  .get("/", async (c) => {
    const rawQuery = c.req.query();
    const { cursor, limit, search } = paginationSchema.parse(rawQuery);
    
    try {
      const result = await farmService.getFarms(cursor, limit, search);
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
    const json = c.req.valid("json") as z.infer<typeof farmInsertSchema>;
    const userId = getUserId(c);

    const normalizedData = {
      ...json,
      imageUrls: normalizeImageUrls(json.imageUrls) ?? null,
    };
    
    const farm = await farmService.createFarm(normalizedData, userId);
    return c.json(farm, 201);
  })
  
  // Update a farm
  .put("/:id", zValidator("json", farmInsertSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const json = c.req.valid("json") as Partial<z.infer<typeof farmInsertSchema>>;
    const userId = getUserId(c);
    
    // Check if the farm exists and belongs to the user
    const existingFarm = await farmService.getFarmById(id);
    if (!existingFarm) {
      return c.json({ error: "Farm not found" }, 404);
    }
    
    if (existingFarm.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    
    const updatePayload = {
      ...json,
      imageUrls:
        json.imageUrls === undefined ? undefined : normalizeImageUrls(json.imageUrls) ?? null,
    };

    const updatedFarm = await farmService.updateFarm(id, updatePayload);
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
