import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { farmRoutes } from "./modules/farms/farms.routes";
import { sharesRoutes } from "./modules/shares/shares.routes";

export function createApp() {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", prettyJSON());
  app.use("*", cors());

  const healthHandler = (c: any) => c.json({ status: "ok" });

  app.get("/health", healthHandler);
  app.get("/api/health", healthHandler);

  const api = new Hono();
  api.route("/farms", farmRoutes);
  api.route("/shares", sharesRoutes);

  app.route("/api", api);

  app.onError((err, c) => {
    console.error(`Error: ${err}`);
    const status = (err as any).status || 500;
    return c.json(
      {
        error: {
          message: err.message || "Internal Server Error",
          status,
        },
      },
      status
    );
  });

  return app;
}
