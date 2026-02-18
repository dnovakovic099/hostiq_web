"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Calendar, DollarSign } from "lucide-react";
import { api } from "@/lib/api";

interface Property {
  id: string;
  name: string;
}

// Mock pricing - structure ready for API integration
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

function generateCalendarDays(propertyId: string): CalendarDay[] {
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
    days.push({ date: dateStr, price, status });
  }
  return days;
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
      setCalendarDays(generateCalendarDays(selectedPropertyId));
    }
  }, [selectedPropertyId]);

  const handleApplyPriceAdjustment = async () => {
    if (!priceAdjustment.startDate || !priceAdjustment.endDate || !priceAdjustment.newPrice) return;
    setApplying(true);
    try {
      // TODO: POST /api/properties/:id/pricing when API exists
      await new Promise((r) => setTimeout(r, 500));
      setPriceAdjustment({ startDate: "", endDate: "", newPrice: "" });
    } finally {
      setApplying(false);
    }
  };

  const toggleDynamicPricing = () => {
    setPricing((p) => ({ ...p, dynamicPricingEnabled: !p.dynamicPricingEnabled }));
  };

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
                <CardDescription>Next 30 days — date, price, and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                  {calendarDays.map((day) => (
                    <div
                      key={day.date}
                      className={cn(
                        "rounded-lg border p-2 text-center min-h-[70px] flex flex-col justify-center",
                        day.status === "available" && "bg-green-500/10 border-green-500/30",
                        day.status === "booked" && "bg-blue-500/20 border-blue-500/40",
                        day.status === "blocked" && "bg-muted border-muted-foreground/30"
                      )}
                    >
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
                    </div>
                  ))}
                </div>
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
              <Card>
                <CardHeader>
                  <CardTitle>Price Adjustment</CardTitle>
                  <CardDescription>Set custom pricing for a date range</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={priceAdjustment.startDate}
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
                  <Button
                    className="w-full"
                    onClick={handleApplyPriceAdjustment}
                    disabled={
                      !priceAdjustment.startDate ||
                      !priceAdjustment.endDate ||
                      !priceAdjustment.newPrice ||
                      applying
                    }
                  >
                    {applying ? "Applying..." : "Apply"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Strategy</CardTitle>
                  <CardDescription>Dynamic pricing settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dynamic Pricing</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pricing.dynamicPricingEnabled}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        pricing.dynamicPricingEnabled ? "bg-primary" : "bg-muted"
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
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Price ($)</label>
                    <Input
                      type="number"
                      value={pricing.minPrice}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, minPrice: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Price ($)</label>
                    <Input
                      type="number"
                      value={pricing.maxPrice}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, maxPrice: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
