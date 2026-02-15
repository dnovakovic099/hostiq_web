import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [env.APP_URL, "http://localhost:3000"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// API version prefix
const api = new Hono();

api.get("/", (c) => {
  return c.json({
    name: "HostIQ API",
    version: "0.1.0",
  });
});

app.route("/api", api);

// Start server
const port = env.PORT;
console.log(`HostIQ API starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`HostIQ API running at http://localhost:${port}`);

export default app;
