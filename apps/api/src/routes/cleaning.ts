import { Hono } from "hono";
import { z } from "zod";
import { prisma, type CleaningStatus } from "@hostiq/db";
import { requireAuth, requireAnyRole } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const cleaning = new Hono();

const cleaningStatusEnum = z.enum([
  "PENDING",
  "REMINDER_SENT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_RESPONSE",
  "ESCALATED",
  "CANCELLED",
]);

const listQuerySchema = z.object({
  propertyId: z.string().optional(),
  status: cleaningStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cleanerId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
  status: cleaningStatusEnum,
  notes: z.string().optional(),
  photosUrls: z.array(z.string().url()).optional(),
});

const addPhotosSchema = z.object({
  urls: z.array(z.string().url()),
});

const assignSchema = z.object({
  propertyId: z.string(),
  primaryCleanerId: z.string(),
  backupCleanerId: z.string().optional(),
  instructions: z.string().optional(),
});

const scheduleQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<CleaningStatus, CleaningStatus[]> = {
  PENDING: ["CONFIRMED", "ESCALATED", "CANCELLED"],
  REMINDER_SENT: ["CONFIRMED", "ESCALATED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "ESCALATED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "ESCALATED", "CANCELLED"],
  COMPLETED: ["ESCALATED"],
  NO_RESPONSE: ["CONFIRMED", "ESCALATED", "CANCELLED"],
  ESCALATED: ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  CANCELLED: [],
};

cleaning.use("*", requireAuth());

function getTaskFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  if (user.role === "OWNER") {
    return { property: { ownerId: user.userId } };
  }
  if (user.role === "CLEANER") {
    return {
      OR: [
        { cleaner: { userId: user.userId } },
        { backupCleaner: { userId: user.userId } },
      ],
    };
  }
  return { id: "impossible" }; // no access
}

function getPropertyFilterForAssign(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  if (user.role === "OWNER") {
    return { ownerId: user.userId };
  }
  return { id: "impossible" };
}

// ============================================
// GET /schedule - Must be before /:id
// ============================================
cleaning.get("/schedule", async (c) => {
  const user = c.get("user");
  const filter = getTaskFilter(user);

  const query = scheduleQuerySchema.safeParse({
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
  });

  const endDefault = new Date();
  endDefault.setDate(endDefault.getDate() + 7);
  const startDate = query.success && query.data.startDate
    ? new Date(query.data.startDate)
    : new Date();
  const endDate = query.success && query.data.endDate
    ? new Date(query.data.endDate)
    : endDefault;

  const tasks = await prisma.cleaningTask.findMany({
    where: {
      ...filter,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      property: { select: { id: true, name: true } },
      cleaner: { select: { id: true, name: true } },
      backupCleaner: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  // Group by date for calendar rendering
  const byDate: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    const key = t.scheduledDate.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(t);
  }

  const schedule = Object.entries(byDate).map(([date, items]) => ({
    date,
    tasks: items.map((t) => ({
      id: t.id,
      propertyName: t.property.name,
      cleanerName: t.cleaner?.name ?? null,
      backupCleanerName: t.backupCleaner?.name ?? null,
      status: t.status,
      scheduledDate: t.scheduledDate,
      timeWindow: t.timeWindow,
    })),
  }));

  return c.json({ success: true, data: schedule });
});

// ============================================
// PUT /assign - Must be before /:id
// ============================================
cleaning.put("/assign", requireAnyRole("OWNER" as UserRole, "ADMIN" as UserRole, "INTERNAL_OPS" as UserRole), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const propFilter = getPropertyFilterForAssign(user);
  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, ...propFilter },
  });
  if (!property) {
    return c.json({ success: false, error: "Property not found" }, 404);
  }

  const assignment = await prisma.cleanerAssignment.upsert({
    where: { propertyId: parsed.data.propertyId },
    create: {
      propertyId: parsed.data.propertyId,
      primaryCleanerId: parsed.data.primaryCleanerId,
      backupCleanerId: parsed.data.backupCleanerId ?? undefined,
      instructions: parsed.data.instructions ?? undefined,
    },
    update: {
      primaryCleanerId: parsed.data.primaryCleanerId,
      backupCleanerId: parsed.data.backupCleanerId ?? null,
      instructions: parsed.data.instructions ?? undefined,
    },
    include: {
      primaryCleaner: true,
      backupCleaner: true,
    },
  });

  return c.json({ success: true, data: assignment });
});

// ============================================
// GET / - List cleaning tasks
// ============================================
cleaning.get("/", async (c) => {
  const user = c.get("user");
  const filter = getTaskFilter(user);

  const query = listQuerySchema.safeParse({
    propertyId: c.req.query("propertyId"),
    status: c.req.query("status"),
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
    cleanerId: c.req.query("cleanerId"),
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
  });

  const params = query.success ? query.data : listQuerySchema.parse({});
  const { page, pageSize, propertyId, status, startDate, endDate, cleanerId } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { ...filter };
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (cleanerId) where.cleanerId = cleanerId;
  if (startDate || endDate) {
    where.scheduledDate = {};
    if (startDate) (where.scheduledDate as Record<string, Date>).gte = new Date(startDate);
    if (endDate) (where.scheduledDate as Record<string, Date>).lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    prisma.cleaningTask.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        cleaner: { select: { id: true, name: true } },
        backupCleaner: { select: { id: true, name: true } },
        reservation: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            guest: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.cleaningTask.count({ where }),
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
// GET /:id - Task detail
// ============================================
cleaning.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getTaskFilter(user);

  const task = await prisma.cleaningTask.findFirst({
    where: { id, ...filter },
    include: {
      property: true,
      cleaner: true,
      backupCleaner: true,
      reservation: {
        include: {
          guest: true,
        },
      },
      checklist: true,
    },
  });

  if (!task) {
    return c.json({ success: false, error: "Task not found" }, 404);
  }

  const photoUrls = task.checklist?.photosUrls ?? [];
  const notes = task.checklist?.notes ?? null;

  return c.json({
    success: true,
    data: {
      ...task,
      photoUrls,
      notes,
    },
  });
});

// ============================================
// PUT /:id/status - Update task status
// ============================================
cleaning.put("/:id/status", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getTaskFilter(user);

  const task = await prisma.cleaningTask.findFirst({
    where: { id, ...filter },
    include: { checklist: true },
  });

  if (!task) {
    return c.json({ success: false, error: "Task not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const allowed = VALID_TRANSITIONS[task.status as CleaningStatus];
  if (!allowed?.includes(parsed.data.status as CleaningStatus)) {
    return c.json(
      { success: false, error: `Invalid status transition from ${task.status} to ${parsed.data.status}` },
      400
    );
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "COMPLETED") {
    updateData.completedAt = new Date();
  }
  if (parsed.data.status === "CONFIRMED") {
    updateData.acknowledgedAt = new Date();
  }

  if (parsed.data.photosUrls?.length) {
    const existingUrls = task.checklist?.photosUrls ?? [];
    const newUrls = [...existingUrls, ...parsed.data.photosUrls];
    const checklistData = {
      itemsJson: (task.checklist?.itemsJson as object) ?? [],
      photosUrls: newUrls,
      notes: parsed.data.notes ?? task.checklist?.notes ?? undefined,
    };
    await prisma.cleaningChecklist.upsert({
      where: { taskId: id },
      create: { taskId: id, ...checklistData },
      update: checklistData,
    });
  } else if (parsed.data.notes !== undefined) {
    const checklistData = {
      itemsJson: (task.checklist?.itemsJson as object) ?? [],
      photosUrls: task.checklist?.photosUrls ?? [],
      notes: parsed.data.notes,
    };
    await prisma.cleaningChecklist.upsert({
      where: { taskId: id },
      create: { taskId: id, ...checklistData },
      update: { notes: parsed.data.notes },
    });
  }

  const updated = await prisma.cleaningTask.update({
    where: { id },
    data: updateData,
    include: {
      property: true,
      cleaner: true,
      backupCleaner: true,
      reservation: { include: { guest: true } },
      checklist: true,
    },
  });

  return c.json({ success: true, data: updated });
});

// ============================================
// POST /:id/photos - Add photo URLs to task
// ============================================
cleaning.post("/:id/photos", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getTaskFilter(user);

  const task = await prisma.cleaningTask.findFirst({
    where: { id, ...filter },
    include: { checklist: true },
  });

  if (!task) {
    return c.json({ success: false, error: "Task not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = addPhotosSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const existingUrls = task.checklist?.photosUrls ?? [];
  const newUrls = [...existingUrls, ...parsed.data.urls];

  const checklistData = {
    itemsJson: (task.checklist?.itemsJson as object) ?? [],
    photosUrls: newUrls,
    notes: task.checklist?.notes ?? undefined,
  };

  await prisma.cleaningChecklist.upsert({
    where: { taskId: id },
    create: { taskId: id, ...checklistData },
    update: { photosUrls: newUrls },
  });

  const updated = await prisma.cleaningTask.findUnique({
    where: { id },
    include: {
      property: true,
      cleaner: true,
      backupCleaner: true,
      reservation: { include: { guest: true } },
      checklist: true,
    },
  });

  return c.json({ success: true, data: updated });
});

// ============================================
// POST /acknowledge/:id - Cleaner acknowledges a task
// ============================================
cleaning.post("/acknowledge/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const task = await prisma.cleaningTask.findFirst({
    where: { id },
    include: { cleaner: true, backupCleaner: true },
  });

  if (!task) {
    return c.json({ success: false, error: "Task not found" }, 404);
  }

  const isAssignedCleaner =
    task.cleaner?.userId === user.userId || task.backupCleaner?.userId === user.userId;
  const isAdmin = user.role === "ADMIN" || user.role === "INTERNAL_OPS";

  if (!isAssignedCleaner && !isAdmin) {
    return c.json({ success: false, error: "Only the assigned cleaner or admin can acknowledge" }, 403);
  }

  if (task.status !== "PENDING" && task.status !== "REMINDER_SENT" && task.status !== "NO_RESPONSE") {
    return c.json(
      { success: false, error: `Task cannot be acknowledged from status ${task.status}` },
      400
    );
  }

  const updated = await prisma.cleaningTask.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      acknowledgedAt: new Date(),
    },
    include: {
      property: true,
      cleaner: true,
      backupCleaner: true,
      reservation: { include: { guest: true } },
      checklist: true,
    },
  });

  return c.json({ success: true, data: updated });
});

export default cleaning;
