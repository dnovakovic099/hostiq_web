"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SprayCan } from "lucide-react";
import { api } from "@/lib/api";

interface CleaningTask {
  id: string;
  scheduledDate: string;
  timeWindow: string | null;
  status: string;
  property: {
    id: string;
    name: string;
  };
  cleaner: {
    id: string;
    name: string;
  } | null;
  backupCleaner: {
    id: string;
    name: string;
  } | null;
}

interface Cleaner {
  id: string;
  name: string | null;
  phone: string | null;
  email: string;
  role: string;
}

interface Property {
  id: string;
  name: string;
}

function getStatusVariant(status: string) {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "ESCALATED":
      return "destructive";
    case "IN_PROGRESS":
      return "secondary";
    default:
      return "outline";
  }
}

export default function CleanersPage() {
  const [upcomingCleanings, setUpcomingCleanings] = useState<CleaningTask[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    propertyId: "",
    primaryCleanerId: "",
    backupCleanerId: "",
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Calculate date range for next 7 days
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split("T")[0];

      const [cleaningsRes, cleanersRes, propertiesRes] = await Promise.all([
        api.get<{ success: true; data: { items: CleaningTask[]; pagination: unknown } }>(
          `/cleaning?startDate=${startDate}&endDate=${endDateStr}&pageSize=50`
        ),
        api.get<{ success: true; data: Cleaner[] }>("/admin/users"),
        api.get<{ success: true; data: Property[] }>("/properties"),
      ]);

      setUpcomingCleanings(cleaningsRes.data.items || []);
      
      // Filter cleaners by role
      const cleanerUsers = (cleanersRes.data || []).filter(
        (u) => u.role === "CLEANER"
      );
      setCleaners(cleanerUsers);
      
      setProperties(propertiesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignmentForm.propertyId || !assignmentForm.primaryCleanerId) {
      return;
    }

    try {
      setAssignError(null);
      setAssignSuccess(false);
      setAssigning(true);

      await api.put<{ success: true; data: unknown }>("/cleaning/assign", {
        propertyId: assignmentForm.propertyId,
        primaryCleanerId: assignmentForm.primaryCleanerId,
        backupCleanerId: assignmentForm.backupCleanerId || undefined,
      });

      setAssignSuccess(true);
      setAssignmentForm({
        propertyId: "",
        primaryCleanerId: "",
        backupCleanerId: "",
      });
      
      // Refresh data to show updated assignments
      await fetchData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setAssignSuccess(false), 3000);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign cleaner");
    } finally {
      setAssigning(false);
    }
  };

  // Calculate active tasks count for each cleaner
  const getActiveTasksCount = (cleanerId: string) => {
    return upcomingCleanings.filter(
      (task) =>
        (task.cleaner?.id === cleanerId || task.backupCleaner?.id === cleanerId) &&
        task.status !== "COMPLETED" &&
        task.status !== "CANCELLED"
    ).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Cleaners</h1>
          <p>Cleaner coordination and task management</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Cleaners</h1>
        <p>Cleaner coordination and task management</p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Cleanings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SprayCan className="h-5 w-5" />
            Upcoming Cleanings
          </CardTitle>
          <CardDescription>Next 7 days of cleaning tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingCleanings.length === 0 ? (
            <p className="text-muted-foreground py-4">No upcoming cleanings scheduled.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingCleanings.map((task) => (
                <Card key={task.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="font-medium">{task.property.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(task.scheduledDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {task.timeWindow && <p className="text-sm">{task.timeWindow}</p>}
                      <p className="text-sm">
                        {task.cleaner?.name || task.backupCleaner?.name || "Unassigned"}
                      </p>
                      <Badge variant={getStatusVariant(task.status)}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cleaners List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cleaners</CardTitle>
            <CardDescription>All cleaners with contact info and task counts</CardDescription>
          </CardHeader>
          <CardContent>
            {cleaners.length === 0 ? (
              <p className="text-muted-foreground py-4">No cleaners found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="premium-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Active Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleaners.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="p-4 font-medium">{c.name || "—"}</td>
                        <td className="p-4">{c.phone ?? "—"}</td>
                        <td className="p-4">{c.email}</td>
                        <td className="p-4">{getActiveTasksCount(c.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
            <CardDescription>Assign primary and backup cleaner to a property</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignError && (
              <p className="text-sm text-destructive">{assignError}</p>
            )}
            {assignSuccess && (
              <p className="text-sm text-green-600">Assignment saved successfully!</p>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Property</label>
              <select
                className="filter-select w-full"
                value={assignmentForm.propertyId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, propertyId: e.target.value }))
                }
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Primary cleaner</label>
              <select
                className="filter-select w-full"
                value={assignmentForm.primaryCleanerId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, primaryCleanerId: e.target.value }))
                }
              >
                <option value="">Select</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Backup cleaner</label>
              <select
                className="filter-select w-full"
                value={assignmentForm.backupCleanerId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, backupCleanerId: e.target.value }))
                }
              >
                <option value="">Select (optional)</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={
                !assignmentForm.propertyId ||
                !assignmentForm.primaryCleanerId ||
                assigning
              }
              onClick={handleAssign}
            >
              {assigning ? "Saving..." : "Save assignment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
