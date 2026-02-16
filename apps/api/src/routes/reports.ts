import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";

const reports = new Hono();

reports.use("*", requireAuth());

// ============================================
// GET /reports/owner-summary
// Monthly owner summary with revenue, occupancy, issues
// ============================================
reports.get("/owner-summary", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);

  // Get properties owned by this user (or all for admin)
  const whereClause =
    user.role === "ADMIN" || user.role === "INTERNAL_OPS"
      ? {}
      : { ownerId: user.userId };

  const properties = await prisma.property.findMany({
    where: whereClause,
    include: {
      reservations: {
        where: {
          checkIn: { lte: endDate },
          checkOut: { gte: startDate },
        },
        include: { guest: true },
      },
      cleaningTasks: {
        where: {
          scheduledDate: { gte: startDate, lte: endDate },
        },
      },
      guestIssues: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      },
    },
  });

  const propertyReports = properties.map((property) => {
    const reservations = property.reservations;
    const totalRevenue = reservations.reduce(
      (sum, r) => sum + (r.total ?? 0),
      0
    );
    const totalNights = reservations.reduce((sum, r) => sum + (r.nights ?? 0), 0);
    const daysInMonth = endDate.getDate();
    const occupancyRate = Math.min(100, Math.round((totalNights / daysInMonth) * 100));
    const avgNightlyRate =
      totalNights > 0 ? totalRevenue / totalNights : 0;

    const completedCleanings = property.cleaningTasks.filter(
      (t) => t.status === "COMPLETED"
    ).length;
    const totalCleanings = property.cleaningTasks.length;

    const openIssues = property.guestIssues.filter(
      (i) => i.status === "OPEN"
    ).length;
    const resolvedIssues = property.guestIssues.filter(
      (i) => i.status === "RESOLVED"
    ).length;

    const channels = reservations.reduce(
      (acc, r) => {
        const ch = r.channel || "Direct";
        acc[ch] = (acc[ch] || 0) + (r.total ?? 0);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      propertyId: property.id,
      propertyName: property.name,
      address: `${property.address || ""}, ${property.city || ""}, ${property.state || ""}`,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalReservations: reservations.length,
      totalNights,
      occupancyRate,
      avgNightlyRate: Math.round(avgNightlyRate * 100) / 100,
      cleaningCompletion: totalCleanings > 0
        ? Math.round((completedCleanings / totalCleanings) * 100)
        : 100,
      openIssues,
      resolvedIssues,
      revenueByChannel: channels,
      topGuests: reservations
        .filter((r) => r.guest)
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
        .slice(0, 5)
        .map((r) => ({
          name: r.guest?.name ?? "Unknown",
          total: r.total ?? 0,
          nights: r.nights ?? 0,
        })),
    };
  });

  const totals = {
    totalRevenue: propertyReports.reduce((s, p) => s + p.totalRevenue, 0),
    totalReservations: propertyReports.reduce((s, p) => s + p.totalReservations, 0),
    totalNights: propertyReports.reduce((s, p) => s + p.totalNights, 0),
    avgOccupancy:
      propertyReports.length > 0
        ? Math.round(
            propertyReports.reduce((s, p) => s + p.occupancyRate, 0) /
              propertyReports.length
          )
        : 0,
    totalOpenIssues: propertyReports.reduce((s, p) => s + p.openIssues, 0),
  };

  return c.json({
    success: true,
    data: {
      month,
      generatedAt: new Date().toISOString(),
      totals,
      properties: propertyReports,
    },
  });
});

// ============================================
// GET /reports/performance
// Property performance over time
// ============================================
reports.get("/performance", async (c) => {
  const user = c.get("user");
  const propertyId = c.req.query("propertyId");
  const months = parseInt(c.req.query("months") || "6");

  const whereClause: Record<string, unknown> = {};
  if (propertyId) whereClause.propertyId = propertyId;
  if (user.role === "OWNER") {
    const ownedPropertyIds = await prisma.property.findMany({
      where: { ownerId: user.userId },
      select: { id: true },
    });
    whereClause.propertyId = { in: ownedPropertyIds.map((p) => p.id) };
  }

  const monthlyData: Array<{
    month: string;
    revenue: number;
    reservations: number;
    nights: number;
    occupancy: number;
  }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const monthNum = d.getMonth();
    const start = new Date(year, monthNum, 1);
    const end = new Date(year, monthNum + 1, 0, 23, 59, 59);
    const label = `${year}-${String(monthNum + 1).padStart(2, "0")}`;

    const reservations = await prisma.reservation.findMany({
      where: {
        ...whereClause,
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
    });

    const revenue = reservations.reduce(
      (s, r) => s + (r.total ?? 0),
      0
    );
    const nights = reservations.reduce((s, r) => s + (r.nights ?? 0), 0);
    const daysInMonth = end.getDate();

    monthlyData.push({
      month: label,
      revenue: Math.round(revenue * 100) / 100,
      reservations: reservations.length,
      nights,
      occupancy: Math.min(100, Math.round((nights / daysInMonth) * 100)),
    });
  }

  return c.json({
    success: true,
    data: { months: monthlyData },
  });
});

// ============================================
// GET /reports/cleaning
// Cleaning operations report
// ============================================
reports.get("/cleaning", async (c) => {
  const user = c.get("user");
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);

  const whereClause: Record<string, unknown> = {
    scheduledDate: { gte: startDate, lte: endDate },
  };

  if (user.role === "OWNER") {
    const props = await prisma.property.findMany({
      where: { ownerId: user.userId },
      select: { id: true },
    });
    whereClause.propertyId = { in: props.map((p) => p.id) };
  }

  const tasks = await prisma.cleaningTask.findMany({
    where: whereClause,
    include: { property: true, cleaner: true },
  });

  const byStatus = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byCleaner = tasks.reduce(
    (acc, t) => {
      const name = t.cleaner?.name || "Unassigned";
      if (!acc[name]) acc[name] = { total: 0, completed: 0, escalated: 0 };
      acc[name].total++;
      if (t.status === "COMPLETED") acc[name].completed++;
      if (t.status === "ESCALATED") acc[name].escalated++;
      return acc;
    },
    {} as Record<string, { total: number; completed: number; escalated: number }>
  );

  const avgTurnaroundMinutes = tasks
    .filter((t) => t.completedAt && t.acknowledgedAt)
    .map((t) => {
      const start = new Date(t.acknowledgedAt!).getTime();
      const end = new Date(t.completedAt!).getTime();
      return (end - start) / 60000;
    });
  const avgTurnaround =
    avgTurnaroundMinutes.length > 0
      ? Math.round(
          avgTurnaroundMinutes.reduce((s, m) => s + m, 0) /
            avgTurnaroundMinutes.length
        )
      : 0;

  return c.json({
    success: true,
    data: {
      month,
      totalTasks: tasks.length,
      byStatus,
      byCleaner,
      avgTurnaroundMinutes: avgTurnaround,
      escalationRate:
        tasks.length > 0
          ? Math.round(((byStatus.ESCALATED || 0) / tasks.length) * 100)
          : 0,
    },
  });
});

// ============================================
// POST /reports/generate-html
// Generate HTML owner report for email delivery
// ============================================
reports.post("/generate-html", async (c) => {
  const user = c.get("user");
  if (user.role !== "ADMIN" && user.role !== "INTERNAL_OPS") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const schema = z.object({
    ownerId: z.string(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid request" }, 400);
  }

  const owner = await prisma.user.findUnique({ where: { id: parsed.data.ownerId } });
  if (!owner) {
    return c.json({ success: false, error: "Owner not found" }, 404);
  }

  const properties = await prisma.property.findMany({
    where: { ownerId: parsed.data.ownerId },
    include: {
      reservations: true,
      cleaningTasks: true,
      guestIssues: true,
    },
  });

  // Generate HTML report
  const totalRevenue = properties.reduce(
    (s, p) => s + p.reservations.reduce((rs, r) => rs + (r.total ?? 0), 0),
    0
  );
  const totalReservations = properties.reduce((s, p) => s + p.reservations.length, 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; max-width: 680px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af, #7c3aed); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .metric .value { font-size: 24px; font-weight: 700; color: #1e40af; }
    .metric .label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .property-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .property-card h3 { margin: 0 0 12px; }
    .stats-row { display: flex; gap: 24px; }
    .stat { flex: 1; }
    .stat .val { font-size: 18px; font-weight: 600; }
    .stat .lbl { font-size: 12px; color: #64748b; }
    .footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>HostIQ Monthly Report</h1>
    <p>${parsed.data.month} | ${owner.name || owner.email}</p>
  </div>

  <div class="metric-grid">
    <div class="metric">
      <div class="value">$${totalRevenue.toLocaleString()}</div>
      <div class="label">Total Revenue</div>
    </div>
    <div class="metric">
      <div class="value">${totalReservations}</div>
      <div class="label">Reservations</div>
    </div>
    <div class="metric">
      <div class="value">${properties.length}</div>
      <div class="label">Properties</div>
    </div>
  </div>

  ${properties
    .map(
      (p) => `
  <div class="property-card">
    <h3>${p.name}</h3>
    <div class="stats-row">
      <div class="stat">
        <div class="val">$${p.reservations.reduce((s, r) => s + (r.total ?? 0), 0).toLocaleString()}</div>
        <div class="lbl">Revenue</div>
      </div>
      <div class="stat">
        <div class="val">${p.reservations.length}</div>
        <div class="lbl">Bookings</div>
      </div>
      <div class="stat">
        <div class="val">${p.cleaningTasks.filter((t) => t.status === "COMPLETED").length}/${p.cleaningTasks.length}</div>
        <div class="lbl">Cleanings Done</div>
      </div>
      <div class="stat">
        <div class="val">${p.guestIssues.filter((i) => i.status === "OPEN").length}</div>
        <div class="lbl">Open Issues</div>
      </div>
    </div>
  </div>`
    )
    .join("")}

  <div class="footer">
    <p>Generated by HostIQ on ${new Date().toLocaleDateString()}</p>
    <p>Questions? Reply to this email or visit your dashboard.</p>
  </div>
</body>
</html>`;

  return c.json({
    success: true,
    data: {
      html,
      ownerEmail: owner.email,
      ownerName: owner.name,
      month: parsed.data.month,
    },
  });
});

export default reports;
