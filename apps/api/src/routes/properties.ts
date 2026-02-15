import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const properties = new Hono();

// Apply auth to all routes
properties.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

// ============================================
// GET / - List all properties for authenticated user
// ============================================
properties.get("/", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const items = await prisma.property.findMany({
    where: filter,
    include: {
      _count: {
        select: {
          reservations: true,
          cleaningTasks: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return c.json({ success: true, data: items });
});

// ============================================
// GET /:id - Get property detail with latest snapshot, cleaner assignments
// ============================================
properties.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const filter = getPropertyFilter(user);
  const property = await prisma.property.findFirst({
    where: { id, ...filter },
    include: {
      listingsSnapshots: {
        orderBy: { snapshotDate: "desc" },
        take: 1,
      },
      cleanerAssignments: {
        include: {
          primaryCleaner: true,
          backupCleaner: true,
        },
      },
    },
  });

  if (!property) {
    return c.json({ success: false, error: "Property not found" }, 404);
  }

  const latestSnapshot = property.listingsSnapshots[0] ?? null;
  const { listingsSnapshots, ...rest } = property;

  return c.json({
    success: true,
    data: {
      ...rest,
      latestSnapshot,
      cleanerAssignments: property.cleanerAssignments,
    },
  });
});

// ============================================
// PUT /:id/settings - Update property settings JSON
// ============================================
const updateSettingsSchema = z.object({
  settingsJson: z.record(z.unknown()),
});

properties.put("/:id/settings", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const body = await c.req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const filter = getPropertyFilter(user);
  const property = await prisma.property.findFirst({
    where: { id, ...filter },
  });

  if (!property) {
    return c.json({ success: false, error: "Property not found" }, 404);
  }

  const updated = await prisma.property.update({
    where: { id },
    data: { settingsJson: parsed.data.settingsJson as object },
  });

  return c.json({ success: true, data: updated });
});

export default properties;
