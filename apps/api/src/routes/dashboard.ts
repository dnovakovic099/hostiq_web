import { Hono } from "hono";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const dashboard = new Hono();

dashboard.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

// ============================================
// GET /stats - Dashboard stats
// ============================================
dashboard.get("/stats", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const [
    checkInsToday,
    checkOutsToday,
    activeGuests,
    monthStats,
    openIssuesCount,
    propertyCount,
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        property: filter,
        status: { notIn: ["CANCELLED"] },
        checkIn: { gte: today, lt: tomorrow },
      },
    }),
    prisma.reservation.count({
      where: {
        property: filter,
        status: { notIn: ["CANCELLED"] },
        checkOut: { gte: today, lt: tomorrow },
      },
    }),
    prisma.reservation.count({
      where: {
        property: filter,
        status: { notIn: ["CANCELLED", "INQUIRY", "PRE_APPROVED"] },
        checkIn: { lte: today },
        checkOut: { gt: today },
      },
    }),
    prisma.reservation.aggregate({
      where: {
        property: filter,
        status: { not: "CANCELLED" },
        checkIn: { gte: monthStart, lte: monthEnd },
      },
      _sum: { total: true },
      _avg: { nightlyRate: true },
      _count: true,
    }),
    prisma.guestIssue.count({
      where: {
        property: filter,
        status: { notIn: ["RESOLVED", "DISMISSED"] },
      },
    }),
    prisma.property.count({ where: filter }),
  ]);

  const totalRevenue = monthStats._sum.total ?? 0;
  const totalNights = await prisma.reservation
    .findMany({
      where: {
        property: filter,
        status: { notIn: ["CANCELLED"] },
        checkIn: { gte: monthStart, lte: monthEnd },
      },
      select: { nights: true },
    })
    .then((r) => r.reduce((acc, x) => acc + x.nights, 0));

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const totalAvailableNights = propertyCount * daysInMonth;
  const occupancyRate =
    totalAvailableNights > 0 ? Math.round((totalNights / totalAvailableNights) * 100) : 0;

  return c.json({
    success: true,
    data: {
      checkInsToday,
      checkOutsToday,
      activeGuests,
      revenueThisMonth: totalRevenue,
      occupancyRate,
      avgNightlyRate: monthStats._avg.nightlyRate ?? 0,
      openIssuesCount,
    },
  });
});

// ============================================
// GET /activity - Recent activity (last 10 events)
// ============================================
dashboard.get("/activity", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const [recentReservations, recentThreads, recentIssues] = await Promise.all([
    prisma.reservation.findMany({
      where: { property: filter },
      include: {
        guest: true,
        property: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.messageThread.findMany({
      where: { property: filter },
      include: {
        guest: true,
        property: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 4,
    }),
    prisma.guestIssue.findMany({
      where: { property: filter },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  type ActivityItem = {
    id: string;
    type: "reservation" | "message" | "issue";
    title: string;
    description: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };

  const activities: ActivityItem[] = [];

  recentReservations.forEach((r) => {
    activities.push({
      id: r.id,
      type: "reservation",
      title: "New reservation",
      description: `${r.guest?.name ?? "Guest"} at ${r.property.name}`,
      timestamp: r.createdAt.toISOString(),
      metadata: { status: r.status, checkIn: r.checkIn.toISOString() },
    });
  });

  recentThreads.forEach((t) => {
    const lastMsg = t.messages[0];
    activities.push({
      id: t.id,
      type: "message",
      title: "New message",
      description: lastMsg
        ? `${t.guest?.name ?? "Guest"}: ${lastMsg.content.slice(0, 50)}...`
        : `${t.guest?.name ?? "Guest"} - ${t.property.name}`,
      timestamp: (t.lastMessageAt ?? t.createdAt).toISOString(),
    });
  });

  recentIssues.forEach((i) => {
    activities.push({
      id: i.id,
      type: "issue",
      title: "New issue",
      description: `${i.category}: ${i.description.slice(0, 50)}...`,
      timestamp: i.createdAt.toISOString(),
      metadata: { severity: i.severity, property: i.property?.name },
    });
  });

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json({
    success: true,
    data: activities.slice(0, 10),
  });
});

// ============================================
// GET /integrations/status - Integration health (any authenticated user)
// ============================================
dashboard.get("/integrations/status", async (c) => {
  const integrations = ["hostify", "hostbuddy", "openphone"];

  const healthRecords = await prisma.integrationHealth.findMany({
    where: { integration: { in: integrations } },
    select: {
      integration: true,
      status: true,
      lastSuccessAt: true,
      consecutiveFailures: true,
    },
  });

  const healthMap = Object.fromEntries(
    healthRecords.map((h) => [h.integration, h])
  );

  const result = integrations.map((name) => {
    const record = healthMap[name];
    return {
      name,
      status: record?.status ?? "unknown",
      lastSuccessAt: record?.lastSuccessAt ?? null,
      consecutiveFailures: record?.consecutiveFailures ?? 0,
    };
  });

  return c.json({ success: true, data: result });
});

export default dashboard;
