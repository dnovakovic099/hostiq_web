"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api";

interface Property {
  id: string;
  name: string;
}

interface Reservation {
  id: string;
  propertyId: string;
  channel: string | null;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number | null;
  property: { id: string; name: string };
}

interface ReservationsListResponse {
  success: boolean;
  data: {
    items: Reservation[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ReservationStats {
  totalCount: number;
  totalRevenue: number;
  totalNights: number;
  avgRevenuePerReservation: number;
}

interface PropertyRevenue {
  propertyId: string;
  propertyName: string;
  revenueThisMonth: number;
  revenueLastMonth: number;
  changePct: number;
  occupancyPct: number;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
}

interface MonthlyRevenue {
  month: string;
  label: string;
  revenue: number;
}


function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeRevenueFromReservations(
  reservations: Reservation[],
  properties: Property[]
): {
  totalAllTime: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  momChangePct: number;
  byProperty: PropertyRevenue[];
  byChannel: ChannelRevenue[];
  monthlyTrend: MonthlyRevenue[];
} {
  const now = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonth);

  let totalAllTime = 0;
  const thisMonthRevenue: Record<string, number> = {};
  const lastMonthRevenue: Record<string, number> = {};
  const byPropertyMap: Record<
    string,
    { thisMonth: number; lastMonth: number; nights: number }
  > = {};
  const byChannelMap: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {};

  const EXCLUDED_STATUSES = new Set(["CANCELLED", "INQUIRY"]);

  for (const r of reservations) {
    if (EXCLUDED_STATUSES.has(r.status)) continue;
    const total = r.total ?? 0;
    totalAllTime += total;

    const channel = r.channel ?? "Direct";
    byChannelMap[channel] = (byChannelMap[channel] ?? 0) + total;

    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    const monthKey = getMonthKey(checkIn);
    monthlyMap[monthKey] = (monthlyMap[monthKey] ?? 0) + total;

    if (monthKey === thisMonthKey) {
      thisMonthRevenue[r.propertyId] = (thisMonthRevenue[r.propertyId] ?? 0) + total;
      if (!byPropertyMap[r.propertyId]) {
        byPropertyMap[r.propertyId] = { thisMonth: 0, lastMonth: 0, nights: 0 };
      }
      byPropertyMap[r.propertyId].thisMonth += total;
      byPropertyMap[r.propertyId].nights += r.nights;
    }
    if (monthKey === lastMonthKey) {
      lastMonthRevenue[r.propertyId] = (lastMonthRevenue[r.propertyId] ?? 0) + total;
      if (!byPropertyMap[r.propertyId]) {
        byPropertyMap[r.propertyId] = { thisMonth: 0, lastMonth: 0, nights: 0 };
      }
      byPropertyMap[r.propertyId].lastMonth += total;
    }
  }

  const revenueThisMonth = Object.values(thisMonthRevenue).reduce((a, b) => a + b, 0);
  const revenueLastMonth = Object.values(lastMonthRevenue).reduce((a, b) => a + b, 0);
  const momChangePct =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : revenueThisMonth > 0
        ? 100
        : 0;

  const byProperty: PropertyRevenue[] = properties.map((p) => {
    const data = byPropertyMap[p.id] ?? { thisMonth: 0, lastMonth: 0, nights: 0 };
    const changePct =
      data.lastMonth > 0
        ? ((data.thisMonth - data.lastMonth) / data.lastMonth) * 100
        : data.thisMonth > 0
          ? 100
          : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const occupancyPct = Math.min(
      100,
      Math.round((data.nights / daysInMonth) * 100)
    );
    return {
      propertyId: p.id,
      propertyName: p.name,
      revenueThisMonth: data.thisMonth,
      revenueLastMonth: data.lastMonth,
      changePct,
      occupancyPct,
    };
  });

  const byChannel: ChannelRevenue[] = Object.entries(byChannelMap).map(
    ([channel, revenue]) => ({ channel, revenue })
  );

  const months: MonthlyRevenue[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months.push({
      month: key,
      label,
      revenue: monthlyMap[key] ?? 0,
    });
  }

  return {
    totalAllTime,
    revenueThisMonth,
    revenueLastMonth,
    momChangePct,
    byProperty,
    byChannel,
    monthlyTrend: months,
  };
}

const PROPERTY_PAGE_SIZE = 10;

export default function RevenuePage() {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [propertyPage, setPropertyPage] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const [statsRes, propsRes, firstPageRes] = await Promise.all([
        api.get<{ success: boolean; data: ReservationStats }>("/reservations/stats").catch(() => null),
        api.get<{ success: boolean; data: Property[] }>("/properties"),
        api.get<ReservationsListResponse>(
          `/reservations?startDate=${startDate}&endDate=${endDate}&page=1&pageSize=500`
        ),
      ]);

      let allReservations = firstPageRes.data.items ?? [];
      const totalPages = firstPageRes.data.pagination?.totalPages ?? 1;

      if (totalPages > 1) {
        const remainingPages = Array.from({ length: totalPages - 1 }, (_, idx) => idx + 2);
        const pageResponses = await Promise.all(
          remainingPages.map((page) =>
            api.get<ReservationsListResponse>(
              `/reservations?startDate=${startDate}&endDate=${endDate}&page=${page}&pageSize=500`
            )
          )
        );
        allReservations = [
          ...allReservations,
          ...pageResponses.flatMap((res) => res.data.items ?? []),
        ];
      }

      setStats(statsRes?.data ?? null);
      setProperties(propsRes.data ?? []);
      setReservations(allReservations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const computed = computeRevenueFromReservations(reservations, properties);
  const totalAllTime = stats?.totalRevenue ?? computed.totalAllTime;
  const maxChannelRevenue = Math.max(
    ...computed.byChannel.map((c) => c.revenue),
    1
  );
  const maxMonthlyRevenue = Math.max(
    ...computed.monthlyTrend.map((m) => m.revenue),
    1
  );

  const sortedProperties = [...computed.byProperty].sort(
    (a, b) => b.revenueThisMonth - a.revenueThisMonth
  );
  const propertyPageCount = Math.ceil(sortedProperties.length / PROPERTY_PAGE_SIZE);
  const pagedProperties = sortedProperties.slice(
    propertyPage * PROPERTY_PAGE_SIZE,
    (propertyPage + 1) * PROPERTY_PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Revenue</h1>
          <p>Revenue analytics and performance tracking</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/40 skeleton" />
              ))}
            </div>
            <div className="h-48 rounded-lg bg-muted/30 skeleton" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Revenue</h1>
          <p className="text-destructive mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Revenue</h1>
        <p>Revenue analytics and performance tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalAllTime.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${computed.revenueThisMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Last Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${computed.revenueLastMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month-over-Month</CardTitle>
            {computed.momChangePct >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                computed.momChangePct >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {computed.momChangePct >= 0 ? "+" : ""}
              {computed.momChangePct.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Property */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Property</CardTitle>
            <CardDescription>
              This month vs last month · {sortedProperties.length} properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Property</th>
                    <th className="text-right p-3 font-medium">This Month</th>
                    <th className="text-right p-3 font-medium">Last Month</th>
                    <th className="text-right p-3 font-medium">Change</th>
                    <th className="text-right p-3 font-medium">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProperties.map((p) => (
                    <tr key={p.propertyId} className="border-b">
                      <td className="p-3 font-medium">{p.propertyName}</td>
                      <td className="p-3 text-right">
                        ${p.revenueThisMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right">
                        ${p.revenueLastMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={cn(
                            p.changePct >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {p.changePct >= 0 ? "+" : ""}
                          {p.changePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">{p.occupancyPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {propertyPageCount > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Page {propertyPage + 1} of {propertyPageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPropertyPage((p) => Math.max(0, p - 1))}
                    disabled={propertyPage === 0}
                    className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropertyPage((p) => Math.min(propertyPageCount - 1, p + 1))}
                    disabled={propertyPage === propertyPageCount - 1}
                    className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Channel */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Channel</CardTitle>
            <CardDescription>Breakdown by booking source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {computed.byChannel.map((c) => {
                const pct = (c.revenue / maxChannelRevenue) * 100;
                return (
                  <div key={c.channel}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium capitalize">{c.channel}</span>
                      <span className="text-muted-foreground">
                        ${c.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary rounded transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {computed.byChannel.length === 0 && (
                <div className="py-12 text-center">
                  <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No channel data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {computed.monthlyTrend.map((m) => {
              const pct = (m.revenue / maxMonthlyRevenue) * 100;
              return (
                <div key={m.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground">
                      ${m.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary rounded transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Recent payouts to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Payout tracking coming soon
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Payout data will be synced from your PMS once available
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
