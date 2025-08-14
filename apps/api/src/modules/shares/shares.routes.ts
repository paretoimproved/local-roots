import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { sharesService } from "./shares.service";
import { farmService } from "../farms/farms.service";
import { csaShareInsertSchema } from "@repo/db";
import { auth, getUserId, requireAuth } from "../../pkg/middleware/clerk-auth";
import { z } from "zod";

// Create shares routes
export const sharesRoutes = new Hono()
  // Get all shares (public)
  .get("/", async (c) => {
    const shares = await sharesService.getAllShares();
    return c.json(shares);
  })

  // Get shares for a specific farm (public)
  .get("/farm/:farmId", async (c) => {
    const farmId = c.req.param("farmId");
    const shares = await sharesService.getSharesByFarmId(farmId);
    return c.json(shares);
  })

  // Get share by ID (public)
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const share = await sharesService.getShareById(id);
    
    if (!share) {
      return c.json({ error: "CSA share not found" }, 404);
    }
    
    return c.json(share);
  })
  
  // Protected routes requiring authentication
  .use("/*", auth())
  
  // Get shares for the authenticated user's farms
  .get("/user/me", async (c) => {
    const userId = getUserId(c);
    const shares = await sharesService.getSharesByUserId(userId);
    return c.json(shares);
  })
  
  // Create a new share for a specific farm
  .post("/farm/:farmId", zValidator("json", csaShareInsertSchema.omit({ id: true, farmId: true })), async (c) => {
    const farmId = c.req.param("farmId");
    const data = c.req.valid("json");
    const userId = getUserId(c);
    
    // Check if the farm exists and belongs to the user
    const farm = await farmService.getFarmById(farmId);
    if (!farm) {
      return c.json({ error: "Farm not found" }, 404);
    }
    
    if (farm.userId !== userId) {
      return c.json({ error: "Unauthorized to create shares for this farm" }, 403);
    }
    
    const share = await sharesService.createShare({
      ...data,
      farmId,
    });
    
    return c.json(share, 201);
  })
  
  // Update a share
  .put("/:id", zValidator("json", csaShareInsertSchema.partial().omit({ id: true, farmId: true })), async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const userId = getUserId(c);
    
    // Check if the share exists and belongs to the user's farm
    const isSharOwnedByUser = await sharesService.checkShareOwnership(id, userId);
    if (!isSharOwnedByUser) {
      return c.json({ error: "Share not found or you are not authorized to modify it" }, 404);
    }
    
    const updatedShare = await sharesService.updateShare(id, data);
    return c.json(updatedShare);
  })
  
  // Toggle share availability
  .put("/:id/availability", zValidator("json", z.object({ available: z.boolean() })), async (c) => {
    const id = c.req.param("id");
    const { available } = c.req.valid("json");
    const userId = getUserId(c);
    
    // Check if the share exists and belongs to the user's farm
    const isShareOwnedByUser = await sharesService.checkShareOwnership(id, userId);
    if (!isShareOwnedByUser) {
      return c.json({ error: "Share not found or you are not authorized to modify it" }, 404);
    }
    
    const updatedShare = await sharesService.toggleAvailability(id, available);
    return c.json(updatedShare);
  })
  
  // Delete a share
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    const userId = getUserId(c);
    
    // Check if the share exists and belongs to the user's farm
    const isShareOwnedByUser = await sharesService.checkShareOwnership(id, userId);
    if (!isShareOwnedByUser) {
      return c.json({ error: "Share not found or you are not authorized to delete it" }, 404);
    }
    
    await sharesService.deleteShare(id);
    return c.json({ success: true });
  }); 