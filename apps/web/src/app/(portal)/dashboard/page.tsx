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
  ChevronRight,
  Sparkles,
  Star,
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
      <div className="space-y-8">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Loading your data...</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[120px] skeleton" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/40 mx-auto mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      label: "Check-ins Today",
      value: stats?.checkInsToday ?? 0,
      sub: "Arriving today",
      icon: ArrowDownRight,
      accent: "stat-accent-blue",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Check-outs Today",
      value: stats?.checkOutsToday ?? 0,
      sub: "Departing today",
      icon: ArrowUpRight,
      accent: "stat-accent-amber",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Active Guests",
      value: stats?.activeGuests ?? 0,
      sub: "Currently staying",
      icon: Users,
      accent: "stat-accent-green",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenueThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "This month",
      icon: DollarSign,
      accent: "stat-accent-indigo",
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-600",
    },
    {
      label: "Occupancy",
      value: `${stats?.occupancyRate ?? 0}%`,
      sub: "Avg across listings",
      icon: BedDouble,
      accent: "stat-accent-purple",
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      label: "Avg Rate",
      value: `$${(stats?.avgNightlyRate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "Per night",
      icon: TrendingUp,
      accent: "stat-accent-cyan",
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600",
    },
    {
      label: "Open Issues",
      value: stats?.openIssuesCount ?? 0,
      sub: "Needs attention",
      icon: AlertTriangle,
      accent: "stat-accent-rose",
      iconBg: (stats?.openIssuesCount ?? 0) > 0
        ? "bg-rose-500/10"
        : "bg-emerald-500/10",
      iconColor: (stats?.openIssuesCount ?? 0) > 0
        ? "text-rose-600"
        : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1>Dashboard</h1>
          <p>
            Overview of your {properties.length} propert{properties.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reservations">
            <Button variant="outline" size="sm">
              <Calendar className="h-3.5 w-3.5" />
              Reservations
            </Button>
          </Link>
          <Link href="/issues">
            <Button variant="outline" size="sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              Issues
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn(
                "stat-accent hover-lift",
                card.accent,
                i === 3 && "col-span-2 lg:col-span-1",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.iconBg)}>
                    <Icon className={cn("h-4 w-4", card.iconColor)} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <Activity className="h-4 w-4 text-muted-foreground/60" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="mt-1">Latest events across your properties</CardDescription>
              </div>
              <Badge variant="secondary" className="font-normal gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {activity.map((item, i) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex gap-3 text-sm py-3 border-b border-border/20 last:border-0 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="shrink-0 mt-0.5">
                      {item.type === "reservation" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                          <Calendar className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {item.type === "message" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {item.type === "issue" && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[13px]">{item.title}</p>
                      <p className="text-muted-foreground text-xs truncate mt-0.5">{item.description}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground/50 shrink-0 mt-0.5">
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
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Zap className="h-4 w-4 text-muted-foreground/60" />
                Integrations
              </CardTitle>
              <CardDescription className="mt-1">Connected service status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {["hostify", "hostbuddy", "openphone"].map((name) => {
                const status = getIntegrationStatus(name);
                return (
                  <div key={name} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-[13px] font-medium capitalize">{name}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-medium",
                        status === "healthy" && "text-emerald-600",
                        status === "degraded" && "text-amber-600",
                        status === "error" && "text-rose-600"
                      )}
                    >
                      {status === "healthy" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {status === "degraded" && <AlertCircle className="h-3.5 w-3.5" />}
                      {status === "error" && <XCircle className="h-3.5 w-3.5" />}
                      {status === "healthy" ? "Connected" : status === "error" ? "Error" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Sparkles className="h-4 w-4 text-muted-foreground/60" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { href: "/reservations", icon: Home, label: "Properties", color: "text-blue-600 bg-blue-500/10" },
                { href: "/messages", icon: MessageSquare, label: "Messages", color: "text-violet-600 bg-violet-500/10" },
                { href: "/reviews", icon: Star, label: "Reviews", color: "text-amber-600 bg-amber-500/10" },
                { href: "/issues", icon: AlertTriangle, label: "Issues", color: "text-rose-600 bg-rose-500/10" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="block group">
                    <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer text-center group-hover:shadow-sm">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", action.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
