import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection
const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Export all schema elements
export * from "./schema";

// Export eq operator for queries
export { eq, and, or, not, like, desc, asc } from "drizzle-orm";

// Generate IDs for new records
export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
} 