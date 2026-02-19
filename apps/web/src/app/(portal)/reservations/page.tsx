"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Search,
  User,
  CreditCard,
  Clipboard,
  SprayCan,
  ArrowUpDown,
  CalendarDays,
  Filter,
  BedDouble,
  DollarSign,
  CalendarClock,
  CircleCheckBig,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

type ReservationStatus =
  | "INQUIRY"
  | "PRE_APPROVED"
  | "ACCEPTED"
  | "MOVED"
  | "EXTENDED"
  | "CANCELLED"
  | "COMPLETED";

interface Property {
  id: string;
  name: string;
  address?: string;
}

interface Guest {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface Reservation {
  id: string;
  propertyId: string;
  guestId: string | null;
  channel: string | null;
  status: ReservationStatus;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number | null;
  guest: Guest | null;
  property: Property;
  financials?: { gross?: number; net?: number; fees?: number } | null;
  cleaningTask?: { id: string; status: string };
  notes?: Array<{ content: string; user: { name: string | null } }>;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CONFIRMED_STATUSES = new Set<ReservationStatus>([
  "ACCEPTED",
  "COMPLETED",
]);

const STATUS_OPTIONS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "MOVED", label: "Moved" },
  { value: "EXTENDED", label: "Extended" },
  { value: "PRE_APPROVED", label: "Pre-Approved" },
  { value: "INQUIRY", label: "Inquiry" },
];

function StatusBadge({ status }: { status: ReservationStatus }) {
  const config: Record<string, { dot: string; cls: string }> = {
    ACCEPTED: { dot: "bg-emerald-500", cls: "status-badge-accepted" },
    COMPLETED: { dot: "bg-slate-400", cls: "status-badge-completed" },
    CANCELLED: { dot: "bg-rose-500", cls: "status-badge-cancelled" },
    MOVED: { dot: "bg-amber-500", cls: "status-badge-pending" },
    EXTENDED: { dot: "bg-blue-500", cls: "status-badge-inquiry" },
    PRE_APPROVED: { dot: "bg-violet-500", cls: "status-badge-default" },
    INQUIRY: { dot: "bg-blue-400", cls: "status-badge-inquiry" },
  };
  const c = config[status] ?? config.INQUIRY;
  return (
    <span className={cn("status-badge", c.cls)}>
      <span className={cn("status-dot", c.dot)} />
      {status.replace("_", " ")}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string | null }) {
  const ch = (channel ?? "").toLowerCase();
  let cls = "channel-default";
  if (ch.includes("airbnb")) cls = "channel-airbnb";
  else if (ch.includes("vrbo")) cls = "channel-vrbo";
  else if (ch.includes("direct") || ch.includes("owner")) cls = "channel-direct";
  else if (ch.includes("booking")) cls = "channel-booking";

  return (
    <span className={cn("channel-badge", cls)}>
      {channel || "Direct"}
    </span>
  );
}

function formatCurrency(n: number | null) {
  return "$" + (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [filters, setFilters] = useState({
    propertyId: "",
    status: "" as ReservationStatus | "",
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
    pageSize: 20,
  });

  const hasActiveFilters =
    Boolean(filters.propertyId) ||
    Boolean(filters.status) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.search);

  const activeFilterCount = [
    filters.propertyId,
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.search,
  ].filter(Boolean).length;

  const fetchReservations = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.status) params.set("status", filters.status);

      if (viewMode === "calendar") {
        // Use the visible calendar month as the date range so we fetch the right reservations
        const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
        params.set("startDate", monthStart.toISOString().slice(0, 10));
        params.set("endDate", monthEnd.toISOString().slice(0, 10));
      } else {
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);
      }

      if (filters.search) params.set("search", filters.search);
      params.set("page", String(filters.page));
      params.set("pageSize", String(viewMode === "calendar" ? 200 : filters.pageSize));

      const res = await api.get<{
        success: boolean;
        data: { items: Reservation[]; pagination: Pagination };
      }>(`/reservations?${params}`);
      setReservations(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode, calendarMonth]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      setProperties(res.data ?? []);
    } catch {
      setProperties([]);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    setLoading(true);
    fetchReservations();
  }, [fetchReservations]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await api.get<{ success: boolean; data: Reservation }>(
        `/reservations/${id}`
      );
      setDetail(res.data);
    } catch {
      setDetail(null);
    }
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
    } else {
      setExpandedId(id);
      fetchDetail(id);
    }
  };

  const stats = useMemo(() => {
    const totalRevenue = reservations.reduce((sum, r) => sum + (r.total ?? 0), 0);
    const totalNights = reservations.reduce((sum, r) => sum + r.nights, 0);
    const acceptedCount = reservations.filter((r) => r.status === "ACCEPTED").length;
    const now = new Date();
    const upcomingWindow = new Date();
    upcomingWindow.setDate(now.getDate() + 14);
    const upcomingCheckIns = reservations.filter((r) => {
      const checkIn = new Date(r.checkIn);
      return checkIn >= now && checkIn <= upcomingWindow;
    }).length;

    return {
      totalRevenue,
      avgNights: reservations.length ? totalNights / reservations.length : 0,
      acceptedCount,
      upcomingCheckIns,
    };
  }, [reservations]);

  const resetFilters = () => {
    setFilters((f) => ({
      ...f,
      propertyId: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
      page: 1,
    }));
  };

  const calendarData = useMemo(() => {
    const firstOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
    start.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }

    const reservationsByDay: Record<string, Reservation[]> = {};
    for (const reservation of reservations) {
      if (!CONFIRMED_STATUSES.has(reservation.status)) continue;
      const checkIn = startOfDay(new Date(reservation.checkIn));
      const checkOut = startOfDay(new Date(reservation.checkOut));
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) continue;

      const cursor = new Date(checkIn);
      // Render reservation through the night before checkout.
      while (cursor < checkOut) {
        const key = formatDayKey(cursor);
        if (!reservationsByDay[key]) reservationsByDay[key] = [];
        reservationsByDay[key].push(reservation);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const todayKey = formatDayKey(new Date());
    return { days, reservationsByDay, todayKey };
  }, [calendarMonth, reservations]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="flex items-center gap-2.5">
            Reservations
            <span
              title="Synced live from your PMS (Hostify). Data refreshes automatically in the background."
              className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary cursor-help"
            >
              <Sparkles className="h-3 w-3" />
              Live sync
            </span>
          </h1>
          <p>
            Manage and track all guest reservations across your properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-violet-500/[0.05]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl" />
        <CardContent className="relative py-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Showing
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {reservations.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pagination?.total
                  ? `of ${pagination.total.toLocaleString()} total reservations`
                  : "current page"}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Revenue (this page)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {reservations.length} rows shown — use filters for totals
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Avg stay (this page)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {stats.avgNights.toFixed(1)} nights
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5" />
                Based on {reservations.length} visible reservations
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Next 14 days (this page)
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {stats.upcomingCheckIns} check-ins
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                {stats.acceptedCount} accepted · page {filters.page} of {pagination?.totalPages ?? 1}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/50">
                Filters
              </span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <CircleCheckBig className="h-3 w-3" />
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
            >
              Clear all
            </Button>
          </div>
          <div className="filter-bar">
            <div className="filter-group flex-1 min-w-[180px]">
              <label>Property</label>
              <select
                className="filter-select w-full"
                value={filters.propertyId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, propertyId: e.target.value, page: 1 }))
                }
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group min-w-[150px]">
              <label>Status</label>
              <select
                className="filter-select w-full"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: e.target.value as ReservationStatus | "",
                    page: 1,
                  }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group min-w-[140px]">
              <label>Check-in from</label>
              <Input
                type="date"
                className="h-9"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))
                }
              />
            </div>
            <div className="filter-group min-w-[140px]">
              <label>Check-in to</label>
              <Input
                type="date"
                className="h-9"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))
                }
              />
            </div>
            <div className="filter-group flex-1 min-w-[200px]">
              <label>Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  placeholder="Guest name, email, channel..."
                  className="pl-9 h-9"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "list" ? (
        <>
          {loading ? (
            <Card>
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 skeleton"
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </div>
            </Card>
          ) : error ? (
            <Card className="border-border/40">
              <CardContent className="py-12 text-center">
                <p className="text-destructive font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fetchReservations()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : reservations.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-16 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No reservations found
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Adjust your filters or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Property</th>
                      <th>
                        <span className="inline-flex items-center gap-1">
                          Check-in
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        </span>
                      </th>
                      <th>Check-out</th>
                      <th className="text-center">Nights</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r, idx) => (
                      <React.Fragment key={r.id}>
                        <tr
                          className={cn(
                            "cursor-pointer group",
                            expandedId === r.id && "bg-primary/[0.02]"
                          )}
                          onClick={() => toggleExpand(r.id)}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 text-primary text-xs font-semibold shrink-0">
                                {r.guest?.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate max-w-[180px]">
                                  {r.guest?.name ?? "Unknown Guest"}
                                </p>
                                {r.guest?.email && !(r.channel ?? "").toLowerCase().includes("owner") && (
                                  <p className="text-[11px] text-muted-foreground/60 truncate max-w-[180px]">
                                    {r.guest.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="text-sm truncate max-w-[240px]">
                              {r.property.name || "—"}
                            </p>
                          </td>
                          <td>
                            <span className="text-sm tabular-nums">
                              {formatDate(r.checkIn)}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm tabular-nums">
                              {formatDate(r.checkOut)}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="inline-flex items-center justify-center h-6 w-8 rounded-md bg-muted/50 text-xs font-medium tabular-nums">
                              {r.nights}
                            </span>
                          </td>
                          <td>
                            <ChannelBadge channel={r.channel} />
                          </td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="text-right">
                            <span className="font-semibold text-sm tabular-nums">
                              {(r.channel ?? "").toLowerCase().includes("owner")
                                ? <span className="text-muted-foreground font-normal">N/A</span>
                                : formatCurrency(r.total)}
                            </span>
                          </td>
                          <td>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {expandedId === r.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr>
                            <td colSpan={9} className="p-0 !border-b-0">
                              <div className="bg-muted/20 border-t border-border/30">
                                <div className="p-6">
                                  {detail?.id === r.id ? (
                                    <div className="grid gap-6 md:grid-cols-4">
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                                          <User className="h-3.5 w-3.5" />
                                          Guest Info
                                        </div>
                                        <div className="rounded-lg bg-card border border-border/40 p-3">
                                          <p className="text-sm font-medium">
                                            {detail.guest?.name ?? "Unknown"}
                                          </p>
                                          {!(detail.channel ?? "").toLowerCase().includes("owner") && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              {detail.guest?.email ?? "No email"}
                                            </p>
                                          )}
                                          {detail.guest?.phone && !(detail.channel ?? "").toLowerCase().includes("owner") && (
                                            <p className="text-xs text-muted-foreground">
                                              {detail.guest.phone}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                                          <CreditCard className="h-3.5 w-3.5" />
                                          Financials
                                        </div>
                                        <div className="rounded-lg bg-card border border-border/40 p-3">
                                          {(detail.channel ?? "").toLowerCase().includes("owner") ? (
                                            <p className="text-sm text-muted-foreground">Owner block — no revenue</p>
                                          ) : (
                                            <>
                                              <p className="text-sm font-medium">
                                                {detail.total != null && detail.total > 0
                                                  ? formatCurrency(detail.total)
                                                  : "No total recorded"}
                                              </p>
                                              {detail.financials && (detail.financials.gross ?? 0) > 0 && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  Gross: {formatCurrency(detail.financials.gross ?? 0)}{" "}
                                                  · Net: {formatCurrency(detail.financials.net ?? 0)}
                                                </p>
                                              )}
                                              {!detail.financials && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                  No financial breakdown available
                                                </p>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                                          <SprayCan className="h-3.5 w-3.5" />
                                          Cleaning
                                        </div>
                                        <div className="rounded-lg bg-card border border-border/40 p-3">
                                          <p className="text-sm">
                                            {detail.cleaningTask
                                              ? detail.cleaningTask.status
                                              : "Not assigned"}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                                          <Clipboard className="h-3.5 w-3.5" />
                                          Notes
                                        </div>
                                        <div className="rounded-lg bg-card border border-border/40 p-3">
                                          {detail.notes && detail.notes.length > 0 ? (
                                            <ul className="text-sm space-y-1">
                                              {detail.notes.map((n, i) => (
                                                <li key={i} className="text-xs">
                                                  {n.content}{" "}
                                                  <span className="text-muted-foreground">
                                                    — {n.user?.name ?? "Unknown"}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p className="text-xs text-muted-foreground">
                                              No notes
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                      <span className="text-sm">Loading details...</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {(pagination.page - 1) * pagination.pageSize + 1}
                    </span>
                    –
                    <span className="font-medium text-foreground">
                      {Math.min(
                        pagination.page * pagination.pageSize,
                        pagination.total
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {pagination.total.toLocaleString()}
                    </span>{" "}
                    reservations
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: f.page - 1 }))
                      }
                      className="h-8 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </Button>
                    {/* Page number indicators */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (
                            pagination.page >= pagination.totalPages - 2
                          ) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <button
                              type="button"
                              key={pageNum}
                              onClick={() =>
                                setFilters((f) => ({ ...f, page: pageNum }))
                              }
                              className={cn(
                                "h-8 w-8 rounded-md text-xs font-medium transition-colors",
                                pageNum === pagination.page
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        setFilters((f) => ({ ...f, page: f.page + 1 }))
                      }
                      className="h-8 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card className="border-border/40 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col gap-3 border-b border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reservations.length} reservation{reservations.length === 1 ? "" : "s"} loaded
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => {
                    const today = new Date();
                    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5"
                  onClick={() =>
                    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-7 gap-px bg-border/30">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="h-28 bg-card p-2">
                    <div className="skeleton h-3 w-8" />
                    <div className="mt-2 space-y-1.5">
                      <div className="skeleton h-4 w-full" />
                      <div className="skeleton h-4 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div className="grid grid-cols-7 border-b border-border/40 bg-muted/30">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => (
                      <div
                        key={weekday}
                        className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {weekday}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-border/30">
                    {calendarData.days.map((day) => {
                      const dayKey = formatDayKey(day);
                      const dayReservations = calendarData.reservationsByDay[dayKey] ?? [];
                      const inCurrentMonth = day.getMonth() === calendarMonth.getMonth();
                      const isToday = dayKey === calendarData.todayKey;

                      return (
                        <div
                          key={dayKey}
                          className={cn(
                            "min-h-[128px] bg-card p-2.5",
                            !inCurrentMonth && "bg-muted/20"
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                                inCurrentMonth ? "text-foreground" : "text-muted-foreground/60",
                                isToday && "bg-primary text-primary-foreground"
                              )}
                            >
                              {day.getDate()}
                            </span>
                            {dayReservations.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {dayReservations.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {dayReservations.slice(0, 3).map((reservation) => (
                              <button
                                type="button"
                                key={`${dayKey}-${reservation.id}`}
                                className={cn(
                                  "w-full rounded-md px-2 py-1 text-left text-[11px] font-medium transition-colors",
                                  reservation.status === "ACCEPTED" && "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20",
                                  reservation.status === "CANCELLED" && "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20",
                                  reservation.status !== "ACCEPTED" &&
                                    reservation.status !== "CANCELLED" &&
                                    "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                                onClick={() => {
                                  setViewMode("list");
                                  toggleExpand(reservation.id);
                                }}
                                title={`${reservation.guest?.name ?? "Guest"} • ${reservation.property.name}`}
                              >
                                <span className="block truncate">
                                  {reservation.guest?.name ?? "Guest"}
                                </span>
                                <span className="block truncate text-[10px] opacity-80">
                                  {reservation.property.name}
                                </span>
                              </button>
                            ))}
                            {dayReservations.length > 3 && (
                              <p className="px-2 text-[10px] font-medium text-muted-foreground">
                                +{dayReservations.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
