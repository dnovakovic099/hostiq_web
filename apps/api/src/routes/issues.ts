import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const issues = new Hono();

const issueStatusEnum = z.enum(["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "DISMISSED"]);

const listQuerySchema = z.object({
  propertyId: z.string().optional(),
  category: z.string().optional(),
  severity: z.string().optional(),
  status: issueStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateIssueSchema = z.object({
  status: issueStatusEnum.optional(),
  assignedTo: z.string().nullable().optional(),
  resolutionNotes: z.string().optional(),
  resolvedAt: z.string().datetime().nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable()),
});

// Apply auth to all routes
issues.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

// ============================================
// GET /analytics - Aggregate stats (must be before /:id)
// ============================================
issues.get("/analytics", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const [byCategory, byProperty, bySeverity, recentIssues] = await Promise.all([
    prisma.guestIssue.groupBy({
      by: ["category"],
      where: { property: filter },
      _count: true,
    }),
    prisma.guestIssue.groupBy({
      by: ["propertyId"],
      where: { property: filter },
      _count: true,
    }),
    prisma.guestIssue.groupBy({
      by: ["severity"],
      where: { property: filter },
      _count: true,
    }),
    prisma.guestIssue.findMany({
      where: {
        property: filter,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { createdAt: true },
    }),
  ]);

  // Get property names for byProperty
  const propertyIds = byProperty.map((p) => p.propertyId).filter(Boolean) as string[];
  const properties = await prisma.property.findMany({
    where: { id: { in: propertyIds } },
    select: { id: true, name: true },
  });
  const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p.name]));

  // Group by date (day) for trends
  const trendsByDay = recentIssues.reduce(
    (acc, item) => {
      const day = item.createdAt.toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return c.json({
    success: true,
    data: {
      byCategory: byCategory.map((item) => ({ category: item.category, count: item._count })),
      byProperty: byProperty.map((p) => ({
        propertyId: p.propertyId,
        propertyName: p.propertyId ? propertyMap[p.propertyId] ?? null : null,
        count: p._count,
      })),
      bySeverity: bySeverity.map((item) => ({ severity: item.severity, count: item._count })),
      trendsOverTime: Object.entries(trendsByDay).map(([date, count]) => ({ date, count })),
    },
  });
});

// ============================================
// GET /common - Most common recurring issues across properties
// ============================================
issues.get("/common", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const recurring = await prisma.recurringIssue.findMany({
    where: { property: filter },
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: { occurrenceCount: "desc" },
    take: 20,
  });

  return c.json({ success: true, data: recurring });
});

// ============================================
// GET / - List guest issues
// ============================================
issues.get("/", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const query = listQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    propertyId: c.req.query("propertyId"),
    category: c.req.query("category"),
    severity: c.req.query("severity"),
    status: c.req.query("status"),
  });

  const params = query.success ? query.data : listQuerySchema.parse({});
  const { page, pageSize, propertyId, category, severity, status } = params;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Record<string, unknown> = {
    property: filter,
  };

  if (propertyId) where.propertyId = propertyId;
  if (category) where.category = category;
  if (severity) where.severity = severity;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.guestIssue.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        reservation: { select: { id: true, checkIn: true, checkOut: true } },
        guest: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.guestIssue.count({ where }),
  ]);

  return c.json({
    success: true,
    data: {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  });
});

// ============================================
// GET /:id - Get issue detail
// ============================================
issues.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const issue = await prisma.guestIssue.findFirst({
    where: { id, property: filter },
    include: {
      property: true,
      reservation: true,
      guest: true,
    },
  });

  if (!issue) {
    return c.json({ success: false, error: "Issue not found" }, 404);
  }

  return c.json({ success: true, data: issue });
});

// ============================================
// PUT /:id - Update issue
// ============================================
issues.put("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const body = await c.req.json();
  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const issue = await prisma.guestIssue.findFirst({
    where: { id, property: filter },
  });

  if (!issue) {
    return c.json({ success: false, error: "Issue not found" }, 404);
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.assignedTo !== undefined) updateData.assignedTo = parsed.data.assignedTo;
  if (parsed.data.resolutionNotes !== undefined) updateData.resolutionNotes = parsed.data.resolutionNotes;
  if (parsed.data.resolvedAt !== undefined) {
    updateData.resolvedAt = parsed.data.resolvedAt ? new Date(parsed.data.resolvedAt) : null;
  }

  const updated = await prisma.guestIssue.update({
    where: { id },
    data: updateData,
    include: {
      property: true,
      reservation: true,
      guest: true,
    },
  });

  return c.json({ success: true, data: updated });
});

export default issues;
