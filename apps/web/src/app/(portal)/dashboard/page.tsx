"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar,
  MessageSquare,
  AlertTriangle,
  Home,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  DollarSign,
  TrendingUp,
  BedDouble,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSSE } from "@/hooks/use-sse";

interface DashboardStats {
  checkInsToday: number;
  checkOutsToday: number;
  activeGuests: number;
  revenueThisMonth: number;
  occupancyRate: number;
  avgNightlyRate: number;
  openIssuesCount: number;
}

interface ActivityItem {
  id: string;
  type: "reservation" | "message" | "issue";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface WebhookStatus {
  hostify?: { webhooks: Array<{ type: string; confirmed: boolean; lastReceived: string | null }> };
  hostbuddy?: { status: string; lastReceived: string | null };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [properties, setProperties] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, activityRes, propertiesRes, webhookRes] = await Promise.all([
        api.get<{ success: boolean; data: DashboardStats }>("/dashboard/stats"),
        api.get<{ success: boolean; data: ActivityItem[] }>("/dashboard/activity"),
        api.get<{ success: boolean; data: unknown[] }>("/properties"),
        api.get<{ success: boolean; data: WebhookStatus }>("/webhooks/status").catch(() => null),
      ]);

      setStats(statsRes.data);
      setActivity(activityRes.data);
      setProperties(propertiesRes.data ?? []);
      if (webhookRes?.data) setWebhookStatus(webhookRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSSE((event) => {
    if (
      event.type === "reservation.new" ||
      event.type === "reservation.updated" ||
      event.type === "message.new" ||
      event.type === "issue.new"
    ) {
      fetchData();
    }
  });

  const getIntegrationStatus = (name: string): "healthy" | "degraded" | "error" => {
    if (!webhookStatus) return "degraded";
    if (name === "hostify") {
      const webhooks = webhookStatus.hostify?.webhooks ?? [];
      const confirmed = webhooks.filter((w) => w.confirmed).length;
      return confirmed > 0 ? "healthy" : "degraded";
    }
    if (name === "hostbuddy") {
      const status = webhookStatus.hostbuddy?.status ?? "unknown";
      return status === "healthy" ? "healthy" : status === "error" ? "error" : "degraded";
    }
    if (name === "openphone") return "degraded";
    return "degraded";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-destructive mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Check-ins Today",
      value: stats?.checkInsToday ?? 0,
      sub: "Guests arriving today",
      icon: ArrowDownRight,
      accent: "stat-accent-blue",
      iconColor: "text-blue-500 bg-blue-50",
    },
    {
      label: "Check-outs Today",
      value: stats?.checkOutsToday ?? 0,
      sub: "Guests departing today",
      icon: ArrowUpRight,
      accent: "stat-accent-amber",
      iconColor: "text-amber-600 bg-amber-50",
    },
    {
      label: "Active Guests",
      value: stats?.activeGuests ?? 0,
      sub: "Currently staying",
      icon: Users,
      accent: "stat-accent-green",
      iconColor: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Revenue This Month",
      value: `$${(stats?.revenueThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "Total from all properties",
      icon: DollarSign,
      accent: "stat-accent-indigo",
      iconColor: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Occupancy Rate",
      value: `${stats?.occupancyRate ?? 0}%`,
      sub: "Average across listings",
      icon: BedDouble,
      accent: "stat-accent-purple",
      iconColor: "text-violet-600 bg-violet-50",
    },
    {
      label: "Avg Nightly Rate",
      value: `$${(stats?.avgNightlyRate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "This month",
      icon: TrendingUp,
      accent: "stat-accent-cyan",
      iconColor: "text-cyan-600 bg-cyan-50",
    },
    {
      label: "Open Issues",
      value: stats?.openIssuesCount ?? 0,
      sub: "Requires attention",
      icon: AlertTriangle,
      accent: "stat-accent-rose",
      iconColor: (stats?.openIssuesCount ?? 0) > 0
        ? "text-rose-600 bg-rose-50"
        : "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5">
            Overview of your {properties.length} properties
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reservations">
            <Button variant="outline" size="sm">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Reservations
            </Button>
          </Link>
          <Link href="/issues">
            <Button variant="outline" size="sm">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Issues
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn(
                "stat-accent",
                card.accent,
                i === 3 && "col-span-2 lg:col-span-1", // revenue gets extra width on small screens
              )}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{card.label}</span>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.iconColor)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity Timeline */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest events across your properties</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                Live
                <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
            ) : (
              <ul className="space-y-1">
                {activity.map((item, i) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex gap-3 text-sm py-3 border-b border-border/40 last:border-0 animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="shrink-0 mt-0.5">
                      {item.type === "reservation" && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                          <Calendar className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {item.type === "message" && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {item.type === "issue" && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">{item.title}</p>
                      <p className="text-muted-foreground text-xs truncate mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integration Health */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Integrations
              </CardTitle>
              <CardDescription>Connected service status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {["hostify", "hostbuddy", "openphone"].map((name) => {
                const status = getIntegrationStatus(name);
                return (
                  <div key={name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium capitalize">{name}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[11px] font-medium gap-1",
                        status === "healthy" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        status === "degraded" && "bg-amber-50 text-amber-700 border-amber-200",
                        status === "error" && "bg-rose-50 text-rose-700 border-rose-200"
                      )}
                    >
                      {status === "healthy" && <CheckCircle2 className="h-3 w-3" />}
                      {status === "degraded" && <AlertCircle className="h-3 w-3" />}
                      {status === "error" && <XCircle className="h-3 w-3" />}
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/reservations" className="block">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Properties</span>
                </div>
              </Link>
              <Link href="/messages" className="block">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Messages</span>
                </div>
              </Link>
              <Link href="/reviews" className="block">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Reviews</span>
                </div>
              </Link>
              <Link href="/issues" className="block">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer text-center">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">Issues</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
