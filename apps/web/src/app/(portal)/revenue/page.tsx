"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number | null;
  property: { id: string; name: string };
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

interface Payout {
  id: string;
  date: string;
  amount: number;
  properties: string[];
  status: "completed" | "pending" | "processing";
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

  for (const r of reservations) {
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
    const daysInMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
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

const MOCK_PAYOUTS: Payout[] = [
  {
    id: "1",
    date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    amount: 12450,
    properties: ["Sunset Villa", "Beach House"],
    status: "completed",
  },
  {
    id: "2",
    date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    amount: 8920,
    properties: ["Sunset Villa", "Beach House", "Mountain Retreat"],
    status: "completed",
  },
  {
    id: "3",
    date: new Date().toISOString().slice(0, 10),
    amount: 15600,
    properties: ["Sunset Villa", "Beach House"],
    status: "processing",
  },
];

export default function RevenuePage() {
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

      const [statsRes, propsRes, resRes] = await Promise.all([
        api.get<{ success: boolean; data: ReservationStats }>("/reservations/stats").catch(() => null),
        api.get<{ success: boolean; data: Property[] }>("/properties"),
        api.get<{ success: boolean; data: { items: Reservation[] } }>(
          `/reservations?startDate=${startDate}&endDate=${endDate}&pageSize=200`
        ),
      ]);

      setStats(statsRes?.data ?? null);
      setProperties(propsRes.data ?? []);
      setReservations(resRes.data.items ?? []);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
          <p className="text-destructive mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenue</h1>
        <p className="text-muted-foreground">Revenue dashboard and analytics</p>
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
            <CardDescription>This month vs last month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                  {computed.byProperty.map((p) => (
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
                <p className="text-muted-foreground text-sm">No channel data yet</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-right p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Properties</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PAYOUTS.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-4">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="p-4 text-right font-medium">
                      ${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {p.properties.join(", ")}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "processing"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
