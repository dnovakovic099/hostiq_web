"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  Search,
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
  { value: "", label: "All" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "MOVED", label: "Moved" },
  { value: "EXTENDED", label: "Extended" },
  { value: "PRE_APPROVED", label: "Pre-Approved" },
  { value: "INQUIRY", label: "Inquiry" },
];

function getStatusVariant(status: ReservationStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "CANCELLED") return "destructive";
  if (status === "ACCEPTED" || status === "COMPLETED") return "default";
  if (status === "INQUIRY" || status === "PRE_APPROVED") return "secondary";
  return "outline";
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

      const res = await api.get<{ success: boolean; data: { items: Reservation[]; pagination: Pagination } }>(
        `/reservations?${params}`
      );
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
      const res = await api.get<{ success: boolean; data: Reservation }>(`/reservations/${id}`);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservations</h1>
        <p className="text-muted-foreground">Manage your property reservations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm font-medium mb-1 block">Property</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.propertyId}
                onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value, page: 1 }))}
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as ReservationStatus | "", page: 1 }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">Start date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">End date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Guest name, email, channel..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-1" />
            List View
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Calendar View
          </Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : reservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No reservations found. Adjust your filters or add a new reservation.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Guest</th>
                      <th className="text-left p-4 font-medium">Property</th>
                      <th className="text-left p-4 font-medium">Check-in</th>
                      <th className="text-left p-4 font-medium">Check-out</th>
                      <th className="text-left p-4 font-medium">Nights</th>
                      <th className="text-left p-4 font-medium">Channel</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <>
                        <tr
                          key={r.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleExpand(r.id)}
                        >
                          <td className="p-4">{r.guest?.name ?? "—"}</td>
                          <td className="p-4">{r.property.name}</td>
                          <td className="p-4">{new Date(r.checkIn).toLocaleDateString()}</td>
                          <td className="p-4">{new Date(r.checkOut).toLocaleDateString()}</td>
                          <td className="p-4">{r.nights}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize">
                              {r.channel ?? "—"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            ${(r.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4">
                            {expandedId === r.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr key={`${r.id}-detail`}>
                            <td colSpan={9} className="p-0 bg-muted/30">
                              <div className="p-6">
                                {detail?.id === r.id ? (
                                  <div className="grid gap-6 md:grid-cols-2">
                                    <div>
                                      <h4 className="font-medium mb-2">Guest info</h4>
                                      <p className="text-sm">
                                        {detail.guest?.name ?? "—"} • {detail.guest?.email ?? "—"}
                                      </p>
                                      {detail.guest?.phone && (
                                        <p className="text-sm text-muted-foreground">{detail.guest.phone}</p>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Financial breakdown</h4>
                                      <p className="text-sm">
                                        Total: ${(detail.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                      </p>
                                      {detail.financials && (
                                        <p className="text-sm text-muted-foreground">
                                          Gross: ${(detail.financials.gross ?? 0).toLocaleString()} • Net: $
                                          {(detail.financials.net ?? 0).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Cleaning task</h4>
                                      <p className="text-sm">
                                        {detail.cleaningTask
                                          ? `Status: ${detail.cleaningTask.status}`
                                          : "No cleaning task"}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Notes</h4>
                                      {detail.notes && detail.notes.length > 0 ? (
                                        <ul className="text-sm space-y-1">
                                          {detail.notes.map((n, i) => (
                                            <li key={i}>
                                              {n.content} — {n.user?.name ?? "Unknown"}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No notes</p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">Loading detail...</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <p className="text-sm text-muted-foreground">Calendar grid placeholder — switch to List View for full data</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 min-h-[400px]">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded border bg-muted/30 flex items-center justify-center text-muted-foreground text-sm"
                >
                  —
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
