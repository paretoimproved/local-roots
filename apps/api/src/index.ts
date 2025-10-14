import { serve } from "@hono/node-server";
import { createApp } from "./app";

const app = createApp();

const startServer = async () => {
  const preferredPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  const portsToTry = preferredPort ? [preferredPort] : [3004, 3005, 3006];

  for (const port of portsToTry) {
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
    }
  }

  console.error("Could not start server on any of the attempted ports.");
  process.exit(1);
};

if (process.env.VERCEL !== "1") {
  void startServer();
}

export default app;
