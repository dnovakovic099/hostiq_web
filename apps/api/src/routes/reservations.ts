import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";

const reservations = new Hono();

const reservationStatusEnum = z.enum([
  "INQUIRY",
  "PRE_APPROVED",
  "ACCEPTED",
  "MOVED",
  "EXTENDED",
  "CANCELLED",
  "COMPLETED",
]);

const listQuerySchema = z.object({
  propertyId: z.string().optional(),
  status: reservationStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

// Apply auth to all routes
reservations.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

// ============================================
// GET /stats - Get reservation stats (must be before /:id)
// ============================================
reservations.get("/stats", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const [totalCount, revenueResult, reservationsForOccupancy] = await Promise.all([
    prisma.reservation.count({
      where: {
        property: filter,
        status: { not: "CANCELLED" },
      },
    }),
    prisma.reservation.aggregate({
      where: {
        property: filter,
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.reservation.findMany({
      where: {
        property: filter,
        status: { notIn: ["CANCELLED", "INQUIRY", "PRE_APPROVED"] },
      },
      select: { checkIn: true, checkOut: true, nights: true },
    }),
  ]);

  const totalRevenue = revenueResult._sum.total ?? 0;
  const totalNights = reservationsForOccupancy.reduce((acc, r) => acc + r.nights, 0);

  return c.json({
    success: true,
    data: {
      totalCount,
      totalRevenue,
      totalNights,
      avgRevenuePerReservation: totalCount > 0 ? totalRevenue / totalCount : 0,
    },
  });
});

// ============================================
// GET / - List reservations with filters
// ============================================
reservations.get("/", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const query = listQuerySchema.safeParse({
    page: c.req.query("page"),
    pageSize: c.req.query("pageSize"),
    propertyId: c.req.query("propertyId"),
    status: c.req.query("status"),
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
    search: c.req.query("search"),
  });

  const params = query.success ? query.data : listQuerySchema.parse({});
  const { page, pageSize, propertyId, status, startDate, endDate, search } = params;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const where: Record<string, unknown> = {
    property: filter,
  };

  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;

  if (startDate) {
    where.checkOut = { gte: new Date(startDate) };
  }
  if (endDate) {
    where.checkIn = { lte: new Date(endDate) };
  }

  if (search) {
    where.OR = [
      { guest: { name: { contains: search, mode: "insensitive" } } },
      { guest: { email: { contains: search, mode: "insensitive" } } },
      { channel: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        guest: true,
        property: { select: { id: true, name: true, address: true } },
      },
      orderBy: { checkIn: "asc" },
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
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
// GET /:id - Get reservation detail
// ============================================
reservations.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const filter = getPropertyFilter(user);

  const reservation = await prisma.reservation.findFirst({
    where: { id, property: filter },
    include: {
      guest: true,
      property: true,
      financials: true,
      notes: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      cleaningTask: true,
    },
  });

  if (!reservation) {
    return c.json({ success: false, error: "Reservation not found" }, 404);
  }

  return c.json({ success: true, data: reservation });
});

export default reservations;
