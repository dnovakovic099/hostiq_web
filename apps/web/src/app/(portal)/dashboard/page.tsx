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
  Plus,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Home,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  XCircle,
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
          <p className="text-muted-foreground">Loading...</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your property management metrics
        </p>
      </div>

      {/* Today's Activity Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checkInsToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">Guests arriving today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-outs Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.checkOutsToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">Guests departing today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Guests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeGuests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently staying</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue This Month</CardTitle>
            <CardDescription>Total revenue from all properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.revenueThisMonth ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <CardDescription>Average across all listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.occupancyRate ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Nightly Rate</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.avgNightlyRate ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openIssuesCount ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 events across reservations, messages, and issues</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No recent activity</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    className="flex gap-3 text-sm border-b pb-3 last:border-0 last:pb-0"
                  >
                    <span className="shrink-0 mt-0.5">
                      {item.type === "reservation" && <Calendar className="h-4 w-4 text-primary" />}
                      {item.type === "message" && <MessageSquare className="h-4 w-4 text-blue-500" />}
                      {item.type === "issue" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Health Score Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integration Health
            </CardTitle>
            <CardDescription>Status of connected integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["hostify", "hostbuddy", "openphone"].map((name) => {
              const status = getIntegrationStatus(name);
              return (
                <div key={name} className="flex items-center justify-between">
                  <span className="font-medium capitalize">{name}</span>
                  <Badge
                    variant={
                      status === "healthy"
                        ? "default"
                        : status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                    className={cn(
                      status === "healthy" && "bg-green-600 hover:bg-green-700",
                      status === "degraded" && "bg-yellow-600 hover:bg-yellow-700"
                    )}
                  >
                    {status === "healthy" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {status === "degraded" && <AlertCircle className="h-3 w-3 mr-1" />}
                    {status === "error" && <XCircle className="h-3 w-3 mr-1" />}
                    {status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/reservations">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              New Property
            </Button>
          </Link>
          <Link href="/messages">
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </Link>
          <Link href="/issues">
            <Button variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              View All Issues
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
