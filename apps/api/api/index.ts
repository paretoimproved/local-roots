import { handle } from "@hono/node-server/vercel";
import { createApp } from "../src/app";

const app = createApp();

export const config = {
  runtime: "nodejs",
};

export default handle(app);
