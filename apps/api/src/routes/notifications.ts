import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth, requireRole } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const notifications = new Hono();

const listQuerySchema = z.object({
  read: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
  escalationsOnly: z.boolean().optional(),
});

const sendSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().url().optional(),
  channels: z.array(z.enum(["in_app", "email", "sms"])),
});

const DEFAULT_PREFERENCES = {
  email: true,
  sms: false,
  inApp: true,
  escalationsOnly: false,
};

notifications.use("*", requireAuth());

// ============================================
// PUT /read-all - Must be before /:id
// ============================================
notifications.put("/read-all", async (c) => {
  const user = c.get("user");

  await prisma.notification.updateMany({
    where: { userId: user.userId, readAt: null },
    data: { readAt: new Date() },
  });

  return c.json({ success: true, data: { marked: "all" } });
});

// ============================================
// GET /preferences - Get notification preferences
// ============================================
notifications.get("/preferences", async (c) => {
  const user = c.get("user");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { notificationPrefsJson: true },
  });

  const prefs = (dbUser?.notificationPrefsJson as Record<string, boolean> | null) ?? {};
  const merged = { ...DEFAULT_PREFERENCES, ...prefs };

  return c.json({ success: true, data: merged });
});

// ============================================
// PUT /preferences - Update notification preferences
// ============================================
notifications.put("/preferences", async (c) => {
  const user = c.get("user");

  const body = await c.req.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { notificationPrefsJson: true },
  });

  const current = (dbUser?.notificationPrefsJson as Record<string, boolean> | null) ?? {};
  const updated = { ...current, ...parsed.data };

  await prisma.user.update({
    where: { id: user.userId },
    data: { notificationPrefsJson: updated as object },
  });

  return c.json({ success: true, data: updated });
});

// ============================================
// POST /send - Send notification (admin only)
// ============================================
notifications.post("/send", requireRole("ADMIN" as UserRole), async (c) => {
  const body = await c.req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const { userId, type, title, message, link, channels } = parsed.data;
  const metadata = link ? { link } : undefined;

  const created: { id: string; channel: string }[] = [];

  for (const channel of channels) {
    const record = await prisma.notification.create({
      data: {
        userId,
        channel: channel === "in_app" ? "in_app" : channel,
        type,
        title,
        body: message,
        metadata: metadata as object | undefined,
      },
    });
    created.push({ id: record.id, channel });

    if (channel === "email") {
      // TODO: Call Resend to send email
      console.log(`[Notifications] TODO: Send email via Resend to user ${userId}: ${title}`);
    }
    if (channel === "sms") {
      // TODO: Call OpenPhone to send SMS
      console.log(`[Notifications] TODO: Send SMS via OpenPhone to user ${userId}: ${title}`);
    }
  }

  return c.json({ success: true, data: { created } });
});

// ============================================
// GET / - List notifications for current user
// ============================================
notifications.get("/", async (c) => {
  const user = c.get("user");

  const query = listQuerySchema.safeParse({
    read: c.req.query("read"),
    type: c.req.query("type"),
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
  });

  const params = query.success ? query.data : listQuerySchema.parse({});
  const { page, pageSize, read, type } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = { userId: user.userId };
  if (read === true) where.readAt = { not: null };
  if (read === false) where.readAt = null;
  if (type) where.type = type;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  const data = items.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.body,
    read: !!n.readAt,
    readAt: n.readAt,
    createdAt: n.createdAt,
    link: (n.metadata as { link?: string } | null)?.link ?? null,
  }));

  return c.json({
    success: true,
    data: {
      items: data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  });
});

// ============================================
// PUT /:id/read - Mark notification as read
// ============================================
notifications.put("/:id/read", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.userId },
  });

  if (!notification) {
    return c.json({ success: false, error: "Notification not found" }, 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return c.json({
    success: true,
    data: {
      id: updated.id,
      read: true,
      readAt: updated.readAt,
    },
  });
});

export default notifications;
