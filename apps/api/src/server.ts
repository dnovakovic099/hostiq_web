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
import aiRoutes from "./routes/ai";
import cleaningRoutes from "./routes/cleaning";
import notificationsRoutes from "./routes/notifications";
import reportsRoutes from "./routes/reports";
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

// Seed endpoint (one-time use, protected by NEXTAUTH_SECRET)
app.post("/seed", async (c) => {
  const { secret } = await c.req.json().catch(() => ({ secret: "" }));
  if (secret !== env.NEXTAUTH_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const { prisma } = await import("@hostiq/db");
    const bcrypt = await import("bcryptjs");

    const adminHash = await bcrypt.hash("admin123!", 12);
    const ownerHash = await bcrypt.hash("owner123!", 12);
    const cleanerHash = await bcrypt.hash("cleaner123!", 12);

    await prisma.user.upsert({
      where: { email: "admin@hostiq.app" },
      update: { passwordHash: adminHash },
      create: { email: "admin@hostiq.app", name: "HostIQ Admin", passwordHash: adminHash, role: "ADMIN", phone: "+15555550100" },
    });
    await prisma.user.upsert({
      where: { email: "owner@demo.com" },
      update: { passwordHash: ownerHash },
      create: { email: "owner@demo.com", name: "Demo Owner", passwordHash: ownerHash, role: "OWNER", phone: "+15555550101" },
    });
    const cleanerUser = await prisma.user.upsert({
      where: { email: "cleaner@demo.com" },
      update: { passwordHash: cleanerHash },
      create: { email: "cleaner@demo.com", name: "Demo Cleaner", passwordHash: cleanerHash, role: "CLEANER", phone: "+15555550102" },
    });
    await prisma.cleaner.upsert({
      where: { userId: cleanerUser.id },
      update: {},
      create: { userId: cleanerUser.id, name: "Demo Cleaner", phone: "+15555550102", email: "cleaner@demo.com", rate: 75.0 },
    });
    for (const integration of ["hostify", "hostbuddy", "openphone", "openai"]) {
      await prisma.integrationHealth.upsert({ where: { integration }, update: {}, create: { integration, status: "unknown" } });
    }
    for (const entityType of ["listings", "reservations", "messages", "reviews"]) {
      await prisma.syncCheckpoint.upsert({
        where: { integration_entityType: { integration: "hostify", entityType } },
        update: {},
        create: { integration: "hostify", entityType, totalSynced: 0 },
      });
    }
    return c.json({ success: true, message: "Database seeded successfully" });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
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
api.route("/ai", aiRoutes);
api.route("/cleaning", cleaningRoutes);
api.route("/notifications", notificationsRoutes);
api.route("/reports", reportsRoutes);

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
