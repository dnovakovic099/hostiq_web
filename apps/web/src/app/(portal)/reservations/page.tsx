"use client";

import React, { useEffect, useState, useCallback } from "react";
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

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const [filters, setFilters] = useState({
    propertyId: "",
    status: "" as ReservationStatus | "",
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
    pageSize: 20,
  });

  const fetchReservations = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.status) params.set("status", filters.status);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.search) params.set("search", filters.search);
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));

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
  }, [filters]);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1>Reservations</h1>
          <p>
            Manage and track all guest reservations across your properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
            <button
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

      {/* Filters */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Filters
            </span>
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
            <Card className="border-border/40">
              <div className="p-8 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 rounded-lg bg-muted/50 animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
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
            <Card className="border-border/40 overflow-hidden">
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
                                {r.guest?.email && (
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
                              {formatCurrency(r.total)}
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
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {detail.guest?.email ?? "No email"}
                                          </p>
                                          {detail.guest?.phone && (
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
                                          <p className="text-sm font-medium">
                                            {formatCurrency(detail.total)}
                                          </p>
                                          {detail.financials && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                              Gross: {formatCurrency(detail.financials.gross ?? 0)}{" "}
                                              · Net: {formatCurrency(detail.financials.net ?? 0)}
                                            </p>
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
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Calendar view coming soon
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Switch to List view for full reservation data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
