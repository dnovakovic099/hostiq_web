import { Hono } from "hono";
import { prisma } from "@hostiq/db";
import { requireAuth, requireRole } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const admin = new Hono();

admin.use("*", requireAuth());
admin.use("*", requireRole("ADMIN" as UserRole));

// ============================================
// GET /users - List all users
// ============================================
admin.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      sessions: {
        orderBy: { lastActiveAt: "desc" },
        take: 1,
        select: { lastActiveAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    lastLogin: u.sessions[0]?.lastActiveAt ?? null,
  }));

  return c.json({ success: true, data: items });
});

// ============================================
// GET /audit - Recent audit log entries
// ============================================
admin.get("/audit", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 100);

  const entries = await prisma.auditLog.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return c.json({ success: true, data: entries });
});

// ============================================
// GET /integrations/health - Integration health status
// ============================================
admin.get("/integrations/health", async (c) => {
  const integrations = ["hostify", "hostbuddy", "openphone"];

  const healthRecords = await prisma.integrationHealth.findMany({
    where: { integration: { in: integrations } },
  });

  const healthMap = Object.fromEntries(
    healthRecords.map((h) => [
      h.integration,
      {
        status: h.status,
        lastSuccessAt: h.lastSuccessAt,
        lastFailureAt: h.lastFailureAt,
        errorMessage: h.errorMessage,
        consecutiveFailures: h.consecutiveFailures,
      },
    ])
  );

  const result = integrations.map((name) => ({
    name,
    ...(healthMap[name] ?? {
      status: "unknown",
      lastSuccessAt: null,
      lastFailureAt: null,
      errorMessage: null,
      consecutiveFailures: 0,
    }),
  }));

  return c.json({ success: true, data: result });
});

export default admin;
