import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import webhookRoutes from "./routes/webhooks/index";
import propertiesRoutes from "./routes/properties";
import reservationsRoutes from "./routes/reservations";
import messagesRoutes from "./routes/messages";
import issuesRoutes from "./routes/issues";
import adminRoutes from "./routes/admin";
import sseRoutes from "./routes/sse";
import { registerEventHandlers } from "./events";
import { registerSSEBridge } from "./events/sse-bridge";
import { startScheduler } from "./workers/scheduler";

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

// API routes
const api = new Hono();

api.get("/", (c) => {
  return c.json({ name: "HostIQ API", version: "0.1.0" });
});

api.route("/auth", authRoutes);
api.route("/dashboard", dashboardRoutes);
api.route("/webhooks", webhookRoutes);
api.route("/properties", propertiesRoutes);
api.route("/reservations", reservationsRoutes);
api.route("/messages", messagesRoutes);
api.route("/issues", issuesRoutes);
api.route("/admin", adminRoutes);
api.route("/sse", sseRoutes);

app.route("/api", api);

// Register event handlers and SSE bridge
registerEventHandlers();
registerSSEBridge();

// Start server
const port = env.PORT;
console.log(`HostIQ API starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`HostIQ API running at http://localhost:${port}`);

// Start background sync scheduler (non-blocking)
if (env.NODE_ENV !== "test") {
  startScheduler();
  console.log("Background sync scheduler started");
}

export default app;
