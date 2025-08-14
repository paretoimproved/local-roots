import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL as string,
  },
} satisfies Config; 