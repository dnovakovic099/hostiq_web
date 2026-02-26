import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const messages = new Hono();

const threadStatusEnum = z.enum([
  "ACTIVE",
  "AUTO_REPLIED",
  "NEEDS_ATTENTION",
  "ESCALATED",
  "RESOLVED",
]);

const listThreadsQuerySchema = z.object({
  propertyId: z.string().optional(),
  status: threadStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

// Apply auth to all routes
messages.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

// ============================================
// GET / - Alias for /threads
// ============================================
messages.get("/", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = url.pathname.replace(/\/?$/, "/threads");
  return c.redirect(url.toString(), 302);
});

// ============================================
// GET /threads - List message threads
// ============================================
messages.get("/threads", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const query = listThreadsQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    propertyId: c.req.query("propertyId"),
    status: c.req.query("status"),
    search: c.req.query("search"),
  });

  const params = query.success ? query.data : listThreadsQuerySchema.parse({});
  const { page, pageSize, propertyId, status, search } = params;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Record<string, unknown> = {
    property: filter,
  };

  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { guest: { name: { contains: search, mode: "insensitive" } } },
      { guest: { email: { contains: search, mode: "insensitive" } } },
      { messages: { some: { content: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.messageThread.findMany({
      where,
      include: {
        guest: true,
        property: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take,
    }),
    prisma.messageThread.count({ where }),
  ]);

  const threads = items.map((t) => {
    const { messages, ...rest } = t;
    return { ...rest, latestMessage: messages[0] ?? null };
  });

  return c.json({
    success: true,
    data: {
      items: threads,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  });
});

// ============================================
// GET /threads/:id - Get thread detail with all messages and AI status
// ============================================
messages.get("/threads/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const thread = await prisma.messageThread.findFirst({
    where: { id, property: filter },
    include: {
      guest: true,
      property: true,
      reservation: true,
      messages: {
        include: {
          aiStatus: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!thread) {
    return c.json({ success: false, error: "Thread not found" }, 404);
  }

  return c.json({ success: true, data: thread });
});

// ============================================
// GET /threads/:id/suggestions - Get AI suggestions for a thread
// ============================================
messages.get("/threads/:id/suggestions", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const thread = await prisma.messageThread.findFirst({
    where: { id, property: filter },
  });

  if (!thread) {
    return c.json({ success: false, error: "Thread not found" }, 404);
  }

  const suggestions = await prisma.messageAiStatus.findMany({
    where: {
      message: { threadId: id },
    },
    include: {
      message: {
        select: { id: true, content: true, senderType: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ success: true, data: suggestions });
});

// ============================================
// POST /threads/:id/approve-suggestion - Approve an AI suggestion
// ============================================
messages.post("/threads/:id/approve-suggestion", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const body = await c.req.json();
  const { messageId } = body as { messageId?: string };

  if (!messageId) {
    return c.json({ success: false, error: "messageId is required" }, 400);
  }

  const thread = await prisma.messageThread.findFirst({
    where: { id, property: filter },
  });

  if (!thread) {
    return c.json({ success: false, error: "Thread not found" }, 404);
  }

  const aiStatus = await prisma.messageAiStatus.findUnique({
    where: { messageId },
  });

  if (!aiStatus) {
    return c.json({ success: false, error: "No AI suggestion found for this message" }, 404);
  }

  await prisma.messageAiStatus.update({
    where: { messageId },
    data: { responded: true },
  });

  return c.json({ success: true, data: { approved: true } });
});

// ============================================
// POST /threads/:id/dismiss-suggestion - Dismiss an AI suggestion
// ============================================
messages.post("/threads/:id/dismiss-suggestion", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const body = await c.req.json();
  const { messageId } = body as { messageId?: string };

  if (!messageId) {
    return c.json({ success: false, error: "messageId is required" }, 400);
  }

  const thread = await prisma.messageThread.findFirst({
    where: { id, property: filter },
  });

  if (!thread) {
    return c.json({ success: false, error: "Thread not found" }, 404);
  }

  // Mark as responded (dismissed) and clear action items
  await prisma.messageAiStatus.update({
    where: { messageId },
    data: { responded: true },
  });

  return c.json({ success: true, data: { dismissed: true } });
});

// ============================================
// GET /inbox - Enhanced inbox view with AI status
// ============================================
messages.get("/inbox", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const query = listThreadsQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    propertyId: c.req.query("propertyId"),
    status: c.req.query("status"),
    search: c.req.query("search"),
  });

  const params = query.success ? query.data : listThreadsQuerySchema.parse({});
  const { page, pageSize, propertyId, status, search } = params;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Record<string, unknown> = { property: filter };
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { guest: { name: { contains: search, mode: "insensitive" } } },
      { guest: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.messageThread.findMany({
      where,
      include: {
        guest: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, name: true } },
        reservation: {
          select: { id: true, checkIn: true, checkOut: true, channel: true, status: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { aiStatus: true },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      skip,
      take,
    }),
    prisma.messageThread.count({ where }),
  ]);

  // Count pending suggestions per thread
  const threadIds = items.map((t) => t.id);
  const pendingSuggestions = await prisma.messageAiStatus.groupBy({
    by: ["messageId"],
    where: {
      responded: false,
      message: { threadId: { in: threadIds } },
    },
  });

  // Map pending counts by thread
  const pendingByThread = new Map<string, number>();
  for (const item of items) {
    const count = pendingSuggestions.filter((ps) =>
      item.messages.some((m) => m.id === ps.messageId)
    ).length;
    if (count > 0) pendingByThread.set(item.id, count);
  }

  const threads = items.map((t) => {
    const { messages, ...rest } = t;
    const latestMessage = messages[0] ?? null;
    return {
      ...rest,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            content: latestMessage.content,
            senderType: latestMessage.senderType,
            createdAt: latestMessage.createdAt,
            aiStatus: latestMessage.aiStatus ?? null,
          }
        : null,
      pendingSuggestions: pendingByThread.get(t.id) ?? 0,
    };
  });

  return c.json({
    success: true,
    data: {
      items: threads,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  });
});

// ============================================
// POST /threads/:id/messages - Send a message (create local record)
// ============================================
messages.post("/threads/:id/messages", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const body = await c.req.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const thread = await prisma.messageThread.findFirst({
    where: { id, property: filter },
  });

  if (!thread) {
    return c.json({ success: false, error: "Thread not found" }, 404);
  }

  const message = await prisma.message.create({
    data: {
      threadId: id,
      senderType: "HOST",
      content: parsed.data.content,
    },
  });

  await prisma.messageThread.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  return c.json({ success: true, data: message });
});

export default messages;
