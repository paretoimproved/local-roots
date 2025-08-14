import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// Get user ID from Clerk session in the request context
export function getUserId(c: Context): string {
  // The auth() middleware from Clerk attaches the userId to the request
  // This is available as c.get("userId") or c.var.userId
  const userId = c.get("userId") || c.var.userId;
  
  if (!userId) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  
  return userId;
}

// Check if user is authenticated
export function requireAuth(c: Context, next: () => Promise<void>) {
  const userId = c.get("userId") || c.var.userId;
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  return next();
} 