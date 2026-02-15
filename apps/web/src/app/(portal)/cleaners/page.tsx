"use client";

import { useState } from "react";
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

// Mock data structure - ready to plug in API when available
interface CleaningTask {
  id: string;
  date: string;
  propertyName: string;
  timeWindow: string;
  cleanerName: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "ESCALATED";
}

interface Cleaner {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  activeTasksCount: number;
  rating: number;
}

interface Property {
  id: string;
  name: string;
}

// Mock data - replace with API calls when cleaning API exists
const MOCK_UPCOMING_CLEANINGS: CleaningTask[] = [
  {
    id: "1",
    date: new Date().toISOString().slice(0, 10),
    propertyName: "Sunset Villa",
    timeWindow: "11:00-15:00",
    cleanerName: "Maria Garcia",
    status: "PENDING",
  },
  {
    id: "2",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    propertyName: "Beach House",
    timeWindow: "10:00-14:00",
    cleanerName: "John Smith",
    status: "CONFIRMED",
  },
  {
    id: "3",
    date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    propertyName: "Mountain Retreat",
    timeWindow: "12:00-16:00",
    cleanerName: "Maria Garcia",
    status: "PENDING",
  },
];

const MOCK_CLEANERS: Cleaner[] = [
  { id: "1", name: "Maria Garcia", phone: "+1 555-0101", email: "maria@example.com", activeTasksCount: 3, rating: 4.9 },
  { id: "2", name: "John Smith", phone: "+1 555-0102", email: "john@example.com", activeTasksCount: 2, rating: 4.7 },
  { id: "3", name: "Ana Lopez", phone: "+1 555-0103", email: "ana@example.com", activeTasksCount: 0, rating: 5.0 },
];

const MOCK_PROPERTIES: Property[] = [
  { id: "1", name: "Sunset Villa" },
  { id: "2", name: "Beach House" },
  { id: "3", name: "Mountain Retreat" },
];

function getStatusVariant(status: CleaningTask["status"]) {
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
  const [upcomingCleanings] = useState<CleaningTask[]>(MOCK_UPCOMING_CLEANINGS);
  const [cleaners] = useState<Cleaner[]>(MOCK_CLEANERS);
  const [properties] = useState<Property[]>(MOCK_PROPERTIES);
  const [assignmentForm, setAssignmentForm] = useState({
    propertyId: "",
    primaryCleanerId: "",
    backupCleanerId: "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cleaners</h1>
        <p className="text-muted-foreground">Cleaner coordination and task management</p>
      </div>

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
            <p className="text-muted-foreground py-4">No upcoming cleanings. Data will load when cleaning API is connected.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingCleanings.map((task) => (
                <Card key={task.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="font-medium">{task.propertyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(task.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm">{task.timeWindow}</p>
                      <p className="text-sm">{task.cleanerName}</p>
                      <Badge variant={getStatusVariant(task.status)}>{task.status.replace("_", " ")}</Badge>
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
              <p className="text-muted-foreground py-4">No cleaners yet. Add cleaners when API is available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Active Tasks</th>
                      <th className="text-left p-4 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleaners.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="p-4 font-medium">{c.name}</td>
                        <td className="p-4">{c.phone ?? "—"}</td>
                        <td className="p-4">{c.email ?? "—"}</td>
                        <td className="p-4">{c.activeTasksCount}</td>
                        <td className="p-4">{c.rating.toFixed(1)}</td>
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
            <div>
              <label className="text-sm font-medium mb-1 block">Property</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={assignmentForm.primaryCleanerId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, primaryCleanerId: e.target.value }))
                }
              >
                <option value="">Select</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Backup cleaner</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={assignmentForm.backupCleanerId}
                onChange={(e) =>
                  setAssignmentForm((f) => ({ ...f, backupCleanerId: e.target.value }))
                }
              >
                <option value="">Select</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={
                !assignmentForm.propertyId ||
                !assignmentForm.primaryCleanerId
              }
              onClick={() => {
                // TODO: POST /api/cleaners/assignments when API exists
                alert("Assignment API not yet available. Structure ready for integration.");
              }}
            >
              Save assignment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
