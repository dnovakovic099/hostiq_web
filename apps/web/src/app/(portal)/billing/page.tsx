"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";
import {
  Check,
  Lock,
  Zap,
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  Shield,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  { label: "Dashboard overview", available: true },
  { label: "Reservations & guest management", available: true },
  { label: "Messages & cleaners", available: true },
  { label: "Pricing calendar — next 7 days only", available: true },
  { label: "Full 30-day pricing calendar", available: false },
  { label: "Dynamic pricing & price adjustments", available: false },
  { label: "Revenue analytics & reports", available: false },
  { label: "AI-powered automation", available: false },
];

const FLAT_FEATURES = [
  { icon: Calendar, label: "Full 30-day pricing calendar" },
  { icon: DollarSign, label: "Dynamic pricing & custom adjustments" },
  { icon: BarChart3, label: "Revenue analytics & detailed reports" },
  { icon: MessageSquare, label: "AI-powered guest message automation" },
  { icon: Zap, label: "Smart escalation & issue tracking" },
  { icon: Shield, label: "Email support" },
];

const PERFORMANCE_FEATURES = [
  { icon: Calendar, label: "Full 30-day pricing calendar" },
  { icon: DollarSign, label: "Dynamic pricing & custom adjustments" },
  { icon: BarChart3, label: "Revenue analytics & detailed reports" },
  { icon: MessageSquare, label: "AI-powered guest message automation" },
  { icon: Zap, label: "Smart escalation & issue tracking" },
  { icon: TrendingUp, label: "Unlimited properties" },
  { icon: Shield, label: "Priority onboarding & success manager" },
];

interface CheckoutResponse {
  success: boolean;
  data?: { url: string | null };
  error?: string;
}

interface PortalResponse {
  success: boolean;
  data?: { url: string };
  error?: string;
}

export default function BillingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const status = user?.subscriptionStatus ?? "FREE";
  const isActive = status === "ACTIVE";
  const isPastDue = status === "PAST_DUE";
  const isCancelled = status === "CANCELLED";
  const isFree = status === "FREE";

  async function handleUpgrade() {
    setError("");
    setLoading(true);
    try {
      const res = await api.post<CheckoutResponse>("/billing/checkout");
      if (!res.success || !res.data?.url) {
        setError(res.error ?? "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setError("");
    setPortalLoading(true);
    try {
      const res = await api.post<PortalResponse>("/billing/portal");
      if (!res.success || !res.data?.url) {
        setError(res.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="page-header">
        <h1>Billing & Subscription</h1>
        <p>Manage your HostIQ plan and payment details</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Current plan status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                isActive && "bg-green-500/15 text-green-400",
                isFree && "bg-muted text-muted-foreground",
                isPastDue && "bg-amber-500/15 text-amber-400",
                isCancelled && "bg-destructive/15 text-destructive"
              )}
            >
              {isActive ? "Active" : isFree ? "Free" : isPastDue ? "Payment Failed" : "Cancelled"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isActive ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You have full access to all HostIQ features. Thank you for being a subscriber!
              </p>
              <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                {portalLoading ? "Opening portal..." : "Manage billing & invoices"}
              </Button>
            </div>
          ) : isPastDue ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your last payment failed. Update your payment method to restore full access.
              </p>
              <Button onClick={handleManageBilling} disabled={portalLoading}>
                {portalLoading ? "Opening portal..." : "Update payment method"}
              </Button>
            </div>
          ) : isCancelled ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your subscription has ended. Resubscribe below to regain full access.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You are on the free plan. Upgrade to unlock the full platform.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      {!isActive && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Free plan */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Free</CardTitle>
              <CardDescription>Basic access to get started</CardDescription>
              <p className="text-3xl font-bold mt-2">
                $0<span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5 text-sm">
                    {f.available ? (
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-green-400" />
                    ) : (
                      <Lock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={cn(!f.available && "text-muted-foreground/50 line-through")}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-6" disabled>
                Current plan
              </Button>
            </CardContent>
          </Card>

          {/* Flat plan */}
          <Card className="border-primary/40 bg-primary/[0.03] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-violet-500" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Flat Plan</CardTitle>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  Up to 20 properties
                </span>
              </div>
              <CardDescription>Predictable monthly cost</CardDescription>
              <p className="text-3xl font-bold mt-2">
                $199<span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {FLAT_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-start gap-2.5 text-sm">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Button className="w-full mt-6" onClick={handleUpgrade} disabled={loading}>
                {loading ? "Redirecting..." : isCancelled ? "Resubscribe" : "Choose Flat Plan"}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Secure checkout via Stripe · Select plan during checkout
              </p>
            </CardContent>
          </Card>

          {/* Performance plan */}
          <Card className="border-violet-500/40 bg-violet-500/[0.03] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Performance Plan</CardTitle>
                <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-400">
                  Unlimited
                </span>
              </div>
              <CardDescription>Pay proportionally to your earnings</CardDescription>
              <p className="text-3xl font-bold mt-2">
                5%<span className="text-base font-normal text-muted-foreground"> of revenue</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {PERFORMANCE_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.label} className="flex items-start gap-2.5 text-sm">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-violet-400" />
                      <span>{f.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Button
                className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? "Redirecting..." : isCancelled ? "Resubscribe" : "Choose Performance Plan"}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Secure checkout via Stripe · Select plan during checkout
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active subscriber: features overview */}
      {isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Your Plan Features</CardTitle>
            <CardDescription>Everything included in your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FLAT_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-2.5 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span>{f.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
