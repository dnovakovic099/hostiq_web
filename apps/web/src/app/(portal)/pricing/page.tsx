"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar, DollarSign, Lock, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface Property {
  id: string;
  name: string;
}

interface PropertyPricing {
  baseRate: number;
  weekendRate: number;
  cleaningFee: number;
  extraGuestFee: number;
  dynamicPricingEnabled: boolean;
  minPrice: number;
  maxPrice: number;
}

interface CalendarDay {
  date: string;
  price: number;
  status: "available" | "booked" | "blocked";
  locked: boolean;
}

const MOCK_PRICING: Record<string, PropertyPricing> = {
  default: {
    baseRate: 150,
    weekendRate: 185,
    cleaningFee: 95,
    extraGuestFee: 35,
    dynamicPricingEnabled: true,
    minPrice: 120,
    maxPrice: 250,
  },
};

const FREE_DAYS_LIMIT = 7;

function generateCalendarDays(propertyId: string, isSubscribed: boolean): CalendarDay[] {
  const days: CalendarDay[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = MOCK_PRICING[propertyId] ?? MOCK_PRICING.default;
    const price = isWeekend ? base.weekendRate : base.baseRate;
    const status: CalendarDay["status"] =
      i % 7 === 2 ? "booked" : i % 11 === 5 ? "blocked" : "available";
    const locked = !isSubscribed && i >= FREE_DAYS_LIMIT;
    days.push({ date: dateStr, price, status, locked });
  }
  return days;
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function PricingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [pricing, setPricing] = useState<PropertyPricing>(MOCK_PRICING.default);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceAdjustment, setPriceAdjustment] = useState({
    startDate: "",
    endDate: "",
    newPrice: "",
  });
  const [applying, setApplying] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isSubscribed = useAuthStore((s) => s.isSubscribed)();

  const today = new Date();
  const maxFreeDate = addDays(today, FREE_DAYS_LIMIT - 1);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      const items = res.data ?? [];
      setProperties(items);
      if (items.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(items[0].id);
      } else if (items.length === 0) {
        const mockProps: Property[] = [
          { id: "mock-1", name: "Sunset Villa" },
          { id: "mock-2", name: "Beach House" },
        ];
        setProperties(mockProps);
        setSelectedPropertyId("mock-1");
      }
    } catch {
      const mockProps: Property[] = [
        { id: "mock-1", name: "Sunset Villa" },
        { id: "mock-2", name: "Beach House" },
      ];
      setProperties(mockProps);
      setSelectedPropertyId("mock-1");
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    if (selectedPropertyId) {
      const p = MOCK_PRICING[selectedPropertyId] ?? MOCK_PRICING.default;
      setPricing(p);
      setCalendarDays(generateCalendarDays(selectedPropertyId, isSubscribed));
    }
  }, [selectedPropertyId, isSubscribed]);

  const handleApplyPriceAdjustment = async () => {
    if (!priceAdjustment.startDate || !priceAdjustment.endDate || !priceAdjustment.newPrice) return;

    if (!isSubscribed && priceAdjustment.endDate > maxFreeDate) {
      return;
    }

    setApplying(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setPriceAdjustment({ startDate: "", endDate: "", newPrice: "" });
    } finally {
      setApplying(false);
    }
  };

  const toggleDynamicPricing = () => {
    if (!isSubscribed) return;
    setPricing((p) => ({ ...p, dynamicPricingEnabled: !p.dynamicPricingEnabled }));
  };

  const adjustmentBeyondFreeLimit =
    !isSubscribed &&
    (priceAdjustment.startDate > maxFreeDate || priceAdjustment.endDate > maxFreeDate);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Pricing</h1>
          <p>Manage pricing and availability across your properties</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded bg-muted/60 skeleton" />
              <div className="h-10 w-48 rounded-lg bg-muted/40 skeleton" />
              <div className="h-40 rounded-lg bg-muted/30 skeleton" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Pricing</h1>
        <p>Manage pricing and availability across your properties</p>
      </div>

      {/* Free-tier notice */}
      {!isSubscribed && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Free plan shows the next <strong>7 days</strong> only. Days 8–30 are locked.{" "}
            <Link href="/billing" className="text-primary font-medium hover:underline">
              Upgrade to unlock the full calendar.
            </Link>
          </span>
        </div>
      )}

      {/* Property Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-w-sm">
            <label className="text-sm font-medium mb-1 block">Property</label>
            <select
              className="filter-select w-full"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="">Select a property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedPropertyId && (
        <>
          {/* Current Pricing Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Pricing
              </CardTitle>
              <CardDescription>Base rates and fees for selected property</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Base Rate</p>
                  <p className="text-xl font-bold">${pricing.baseRate}/night</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Weekend Rate</p>
                  <p className="text-xl font-bold">${pricing.weekendRate}/night</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cleaning Fee</p>
                  <p className="text-xl font-bold">${pricing.cleaningFee}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Extra Guest Fee</p>
                  <p className="text-xl font-bold">${pricing.extraGuestFee}/guest</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Pricing View */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendar Pricing
                </CardTitle>
                <CardDescription>
                  {isSubscribed
                    ? "Next 30 days — date, price, and status"
                    : `Next 7 days (free) · Days 8–30 require Pro`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                  {calendarDays.map((day, idx) => (
                    <div
                      key={day.date}
                      className={cn(
                        "relative rounded-lg border p-2 text-center min-h-[70px] flex flex-col justify-center transition-opacity",
                        day.locked
                          ? "bg-muted/30 border-muted-foreground/10 opacity-50"
                          : day.status === "available" && "bg-green-500/10 border-green-500/30",
                        !day.locked && day.status === "booked" && "bg-blue-500/20 border-blue-500/40",
                        !day.locked && day.status === "blocked" && "bg-muted border-muted-foreground/30"
                      )}
                    >
                      {day.locked && idx === FREE_DAYS_LIMIT && (
                        <div className="absolute -left-px top-0 bottom-0 w-px bg-primary/40" />
                      )}
                      {day.locked ? (
                        <Lock className="h-4 w-4 mx-auto text-muted-foreground/40" />
                      ) : (
                        <>
                          <p className="text-xs font-medium text-muted-foreground">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm font-bold">${day.price}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            {day.status}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {!isSubscribed && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Unlock the full 30-day calendar with Pro</span>
                    </div>
                    <Link
                      href="/billing"
                      className="text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      Upgrade →
                    </Link>
                  </div>
                )}

                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500/30" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500/30" /> Booked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-muted" /> Blocked
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Price Adjustment & Strategy */}
            <div className="space-y-6">
              <Card className={cn(!isSubscribed && "relative overflow-hidden")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Price Adjustment
                    {!isSubscribed && (
                      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        7-day limit
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isSubscribed
                      ? "Set custom pricing for a date range"
                      : `Free plan: adjustments up to ${new Date(maxFreeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} only`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={priceAdjustment.startDate}
                      min={today.toISOString().slice(0, 10)}
                      max={isSubscribed ? undefined : maxFreeDate}
                      onChange={(e) =>
                        setPriceAdjustment((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">End Date</label>
                    <Input
                      type="date"
                      value={priceAdjustment.endDate}
                      min={priceAdjustment.startDate || today.toISOString().slice(0, 10)}
                      max={isSubscribed ? undefined : maxFreeDate}
                      onChange={(e) =>
                        setPriceAdjustment((p) => ({ ...p, endDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">New Price ($/night)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 175"
                      value={priceAdjustment.newPrice}
                      onChange={(e) =>
                        setPriceAdjustment((p) => ({ ...p, newPrice: e.target.value }))
                      }
                    />
                  </div>
                  {adjustmentBeyondFreeLimit && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Selected dates exceed your 7-day limit.{" "}
                      <Link href="/billing" className="underline">
                        Upgrade
                      </Link>
                    </p>
                  )}
                  <Button
                    className="w-full"
                    onClick={handleApplyPriceAdjustment}
                    disabled={
                      !priceAdjustment.startDate ||
                      !priceAdjustment.endDate ||
                      !priceAdjustment.newPrice ||
                      applying ||
                      adjustmentBeyondFreeLimit
                    }
                  >
                    {applying ? "Applying..." : "Apply"}
                  </Button>
                </CardContent>
              </Card>

              <Card className={cn(!isSubscribed && "relative")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Pricing Strategy
                    {!isSubscribed && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                  <CardDescription>Dynamic pricing settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={cn("flex items-center justify-between", !isSubscribed && "opacity-50 pointer-events-none select-none")}>
                    <span className="text-sm font-medium">Dynamic Pricing</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pricing.dynamicPricingEnabled}
                      disabled={!isSubscribed}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        pricing.dynamicPricingEnabled ? "bg-primary" : "bg-muted",
                        !isSubscribed && "cursor-not-allowed"
                      )}
                      onClick={toggleDynamicPricing}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                          pricing.dynamicPricingEnabled ? "translate-x-5" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                  <div className={cn(!isSubscribed && "opacity-50 pointer-events-none select-none")}>
                    <label className="text-sm font-medium mb-1 block">Min Price ($)</label>
                    <Input
                      type="number"
                      value={pricing.minPrice}
                      disabled={!isSubscribed}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, minPrice: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className={cn(!isSubscribed && "opacity-50 pointer-events-none select-none")}>
                    <label className="text-sm font-medium mb-1 block">Max Price ($)</label>
                    <Input
                      type="number"
                      value={pricing.maxPrice}
                      disabled={!isSubscribed}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, maxPrice: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>

                  {!isSubscribed && (
                    <Link href="/billing">
                      <Button variant="outline" size="sm" className="w-full mt-1">
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Upgrade to enable dynamic pricing
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
