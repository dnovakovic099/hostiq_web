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
import { cn } from "@/lib/utils";
import {
  Calendar,
  MessageSquare,
  AlertTriangle,
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

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

  const healthyIntegrationsCount = ["hostify", "hostbuddy", "openphone"].filter(
    (n) => getIntegrationStatus(n) === "healthy"
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Hero skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-purple-500/20 border border-white/10 overflow-hidden">
          <div className="p-6 md:p-8 space-y-4">
            <div className="h-6 w-32 rounded-full bg-white/20 skeleton" />
            <div className="h-8 w-48 rounded-lg bg-white/20 skeleton" />
            <div className="h-4 w-64 rounded bg-white/15 skeleton" />
            <div className="flex gap-3 pt-2">
              <div className="h-9 w-28 rounded-lg bg-white/20 skeleton" />
              <div className="h-9 w-24 rounded-lg bg-white/20 skeleton" />
            </div>
            <div className="flex flex-wrap gap-3 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-28 rounded-full bg-white/15 skeleton" />
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-muted/60 skeleton" />
                <div className="h-5 w-14 rounded-full bg-muted/60 skeleton" />
              </div>
              <div className="h-8 w-20 rounded bg-muted/60 skeleton" />
              <div className="h-3 w-24 rounded bg-muted/40 skeleton" />
            </div>
          ))}
        </div>

        {/* Content columns skeleton */}
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-xl border bg-card p-6 space-y-4">
            <div className="h-5 w-32 rounded bg-muted/60 skeleton" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 py-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/60 skeleton shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted/60 skeleton" />
                    <div className="h-3 w-1/2 rounded bg-muted/40 skeleton" />
                  </div>
                  <div className="h-4 w-16 rounded bg-muted/40 skeleton shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="h-5 w-28 rounded bg-muted/60 skeleton" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-muted/40 skeleton" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <div className="h-5 w-24 rounded bg-muted/60 skeleton mb-4" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted/40 skeleton" />
                ))}
              </div>
            </div>
          </div>
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
      pill: "Today",
      icon: ArrowDownRight,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Check-outs Today",
      value: stats?.checkOutsToday ?? 0,
      sub: "Departing today",
      pill: "Today",
      icon: ArrowUpRight,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Active Guests",
      value: stats?.activeGuests ?? 0,
      sub: "Currently staying",
      pill: "Live",
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenueThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "This month",
      pill: "Monthly",
      icon: DollarSign,
      iconBg: "bg-indigo-500/10",
      iconColor: "text-indigo-600",
    },
    {
      label: "Occupancy",
      value: `${stats?.occupancyRate ?? 0}%`,
      sub: "Avg across listings",
      pill: "Rate",
      icon: BedDouble,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
    },
    {
      label: "Avg Rate",
      value: `$${(stats?.avgNightlyRate ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      sub: "Per night",
      pill: "Avg",
      icon: TrendingUp,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600",
    },
    {
      label: "Open Issues",
      value: stats?.openIssuesCount ?? 0,
      sub: "Needs attention",
      pill: (stats?.openIssuesCount ?? 0) > 0 ? "Attention" : "Clear",
      icon: AlertTriangle,
      iconBg: (stats?.openIssuesCount ?? 0) > 0 ? "bg-rose-500/10" : "bg-emerald-500/10",
      iconColor: (stats?.openIssuesCount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Premium hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 border border-white/10 shadow-xl overflow-hidden">
        <div className="p-6 md:p-8 text-white">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            {getGreeting()}
          </span>
          <h1 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-white/80">
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} in your portfolio
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/reservations">
              <Button
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Reservations
              </Button>
            </Link>
            <Link href="/issues">
              <Button
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                Issues
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              {healthyIntegrationsCount} Healthy Integrations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats?.openIssuesCount ?? 0} Open Issues
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
              <DollarSign className="h-3.5 w-3.5" />
              ${(stats?.revenueThisMonth ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} Monthly Revenue
            </span>
          </div>
        </div>
      </div>

      {/* Stat cards - 4-col grid on xl */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="overflow-hidden border-border/60">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.iconBg)}>
                    <Icon className={cn("h-4 w-4", card.iconColor)} />
                  </div>
                  <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {card.pill}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Live Activity */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Activity className="h-4 w-4 text-muted-foreground/60" />
              Live Activity
            </CardTitle>
            <CardDescription className="mt-1">Latest events across your properties</CardDescription>
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
                    className="flex gap-3 text-sm py-3 border-b border-border/20 last:border-0"
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
                    <span className="text-[11px] text-muted-foreground/70 shrink-0 mt-0.5">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integrations */}
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
                  <div
                    key={name}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-[13px] font-medium capitalize">{name}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        status === "healthy" && "bg-emerald-500/15 text-emerald-600",
                        status === "degraded" && "bg-amber-500/15 text-amber-600",
                        status === "error" && "bg-rose-500/15 text-rose-600"
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
              <CardTitle className="text-[15px]">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { href: "/reservations", icon: Calendar, label: "Reservations", color: "text-blue-600 bg-blue-500/10" },
                { href: "/messages", icon: MessageSquare, label: "Messages", color: "text-violet-600 bg-violet-500/10" },
                { href: "/revenue", icon: DollarSign, label: "Revenue", color: "text-emerald-600 bg-emerald-500/10" },
                { href: "/issues", icon: AlertTriangle, label: "Issues", color: "text-rose-600 bg-rose-500/10" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href} className="block group">
                    <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 cursor-pointer text-center group-hover:shadow-sm">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", action.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {action.label}
                      </span>
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
