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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BarChart3,
  List,
} from "lucide-react";
import { api } from "@/lib/api";

type IssueStatus = "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";

interface Property {
  id: string;
  name: string;
}

interface Guest {
  id: string;
  name: string | null;
  email: string | null;
}

interface Issue {
  id: string;
  propertyId: string | null;
  category: string;
  description: string;
  severity: string;
  source: string;
  status: IssueStatus;
  assignedTo: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  photosUrls: string[];
  createdAt: string;
  property: Property | null;
  guest: Guest | null;
}

interface Analytics {
  byCategory: { category: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

const STATUS_OPTIONS: { value: IssueStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Investigating" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

function getSeverityVariant(severity: string): "critical" | "high" | "medium" | "low" | "default" {
  const s = severity?.toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");

  const [filters, setFilters] = useState({
    propertyId: "",
    category: "",
    severity: "",
    status: "" as IssueStatus | "",
    page: 1,
    pageSize: 20,
  });

  const [resolutionForm, setResolutionForm] = useState({
    status: "" as IssueStatus,
    resolutionNotes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.category) params.set("category", filters.category);
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.status) params.set("status", filters.status);
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));

      const res = await api.get<{ success: boolean; data: { items: Issue[] } }>(
        `/issues?${params}`
      );
      setIssues(res.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Analytics }>("/issues/analytics");
      setAnalytics(res.data);
    } catch {
      setAnalytics(null);
    }
  }, []);

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
    fetchIssues();
  }, [fetchIssues]);

  useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  const openIssues = issues.filter((i) => !["RESOLVED", "DISMISSED"].includes(i.status));
  const criticalCount = issues.filter((i) => i.severity?.toLowerCase() === "critical").length;
  const highCount = issues.filter((i) => i.severity?.toLowerCase() === "high").length;

  const saveResolution = async (issueId: string) => {
    if (!resolutionForm.status) return;
    setSaving(true);
    try {
      await api.put(`/issues/${issueId}`, {
        status: resolutionForm.status,
        resolutionNotes: resolutionForm.resolutionNotes || undefined,
        resolvedAt: resolutionForm.status === "RESOLVED" ? new Date().toISOString() : null,
      });
      setExpandedId(null);
      setResolutionForm({ status: "" as IssueStatus, resolutionNotes: "" });
      fetchIssues();
    } catch {
      // Error
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setResolutionForm({ status: "" as IssueStatus, resolutionNotes: "" });
    } else {
      setExpandedId(id);
      const issue = issues.find((i) => i.id === id);
      if (issue) {
        setResolutionForm({
          status: issue.status,
          resolutionNotes: issue.resolutionNotes ?? "",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Issues</h1>
        <p>Guest issues and resolution tracking</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIssues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[180px]">
              <label className="text-sm font-medium mb-1 block">Property</label>
              <select
                className="filter-select w-full"
                value={filters.propertyId}
                onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value, page: 1 }))}
              >
                <option value="">All</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Input
                placeholder="Category"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
              />
            </div>
            <div className="min-w-[120px]">
              <label className="text-sm font-medium mb-1 block">Severity</label>
              <select
                className="filter-select w-full"
                value={filters.severity}
                onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value, page: 1 }))}
              >
                <option value="">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="filter-select w-full"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as IssueStatus | "", page: 1 }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab switch */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "list" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("list")}
        >
          <List className="h-4 w-4 mr-1" />
          List
        </Button>
        <Button
          variant={activeTab === "analytics" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("analytics")}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
          Analytics
        </Button>
      </div>

      {activeTab === "list" ? (
        <>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : issues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No issues found. Adjust your filters.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="premium-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Property</th>
                      <th className="text-left p-4 font-medium">Severity</th>
                      <th className="text-left p-4 font-medium">Source</th>
                      <th className="text-left p-4 font-medium">Created</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Assigned</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((i) => (
                      <>
                        <tr
                          key={i.id}
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleExpand(i.id)}
                        >
                          <td className="p-4">{i.category}</td>
                          <td className="p-4 max-w-[200px] truncate">{i.description}</td>
                          <td className="p-4">{i.property?.name ?? "—"}</td>
                          <td className="p-4">
                            <Badge variant={getSeverityVariant(i.severity)}>
                              {i.severity}
                            </Badge>
                          </td>
                          <td className="p-4">{i.source}</td>
                          <td className="p-4">{new Date(i.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <Badge variant="outline">{i.status}</Badge>
                          </td>
                          <td className="p-4">{i.assignedTo ?? "—"}</td>
                          <td className="p-4">
                            {expandedId === i.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </td>
                        </tr>
                        {expandedId === i.id && (
                          <tr key={`${i.id}-detail`}>
                            <td colSpan={9} className="p-0 bg-muted/30">
                              <div className="p-6">
                                <div className="grid gap-6 md:grid-cols-2 mb-6">
                                  <div>
                                    <h4 className="font-medium mb-2">Full description</h4>
                                    <p className="text-sm">{i.description}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Photos</h4>
                                    {i.photosUrls?.length > 0 ? (
                                      <div className="flex gap-2 flex-wrap">
                                        {i.photosUrls.map((url, idx) => (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt=""
                                            className="h-20 w-20 object-cover rounded border"
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No photos</p>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Timeline</h4>
                                    <p className="text-sm">
                                      Created {new Date(i.createdAt).toLocaleString()}
                                      {i.resolvedAt && (
                                        <> • Resolved {new Date(i.resolvedAt).toLocaleString()}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="border-t pt-6">
                                  <h4 className="font-medium mb-3">Resolution</h4>
                                  <div className="flex flex-col gap-3 max-w-md">
                                    <div>
                                      <label className="text-sm font-medium mb-1 block">Status</label>
                                      <select
                                        className="filter-select w-full"
                                        value={resolutionForm.status}
                                        onChange={(e) =>
                                          setResolutionForm((f) => ({
                                            ...f,
                                            status: e.target.value as IssueStatus,
                                          }))
                                        }
                                      >
                                        {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                                          <option key={o.value} value={o.value}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium mb-1 block">
                                        Resolution notes
                                      </label>
                                      <textarea
                                        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                                        value={resolutionForm.resolutionNotes}
                                        onChange={(e) =>
                                          setResolutionForm((f) => ({
                                            ...f,
                                            resolutionNotes: e.target.value,
                                          }))
                                        }
                                        placeholder="Add resolution notes..."
                                      />
                                    </div>
                                    <Button
                                      onClick={() => saveResolution(i.id)}
                                      disabled={saving || !resolutionForm.status}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Issues by Category
            </CardTitle>
            <CardDescription>Simple bar representation</CardDescription>
          </CardHeader>
          <CardContent>
            {!analytics ? (
              <p className="text-muted-foreground">Loading analytics...</p>
            ) : analytics.byCategory.length === 0 ? (
              <p className="text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-4">
                {analytics.byCategory.map((item) => {
                  const max = Math.max(...analytics.byCategory.map((c) => c.count), 1);
                  const pct = (item.count / max) * 100;
                  return (
                    <div key={item.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
