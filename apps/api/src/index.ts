import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { serve } from "@hono/node-server";
import { farmRoutes } from "./modules/farms/farms.routes";
import { sharesRoutes } from "./modules/shares/shares.routes";

// Create main API app
const app = new Hono();

// Apply middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// API routes
const api = new Hono();
api.route("/farms", farmRoutes);
api.route("/shares", sharesRoutes);

// Mount API routes under /api
app.route("/api", api);

// Error handling
app.onError((err, c) => {
  console.error(`Error: ${err}`);
  const status = (err as any).status || 500;
  return c.json(
    {
      error: {
        message: err.message || "Internal Server Error",
        status: status,
      },
    },
    status
  );
});

// Start the server
const startServer = async () => {
  // Try ports in sequence: 3004, 3005, 3006
  const ports = [3004, 3005, 3006];
  
  for (const port of ports) {
    try {
      console.log(`Attempting to start server on port ${port}...`);
      await serve({
        fetch: app.fetch,
        port,
      });
      console.log(`Server started successfully on port ${port}`);
      return;
    } catch (error) {
      console.log(`Failed to start on port ${port}, trying next port...`);
      continue;
    }
  }
  
  console.error("Could not start server on any of the attempted ports.");
  process.exit(1);
};

startServer(); 