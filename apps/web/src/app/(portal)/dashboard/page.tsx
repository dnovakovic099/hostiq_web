import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Calendar, MessageSquare, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your property management metrics
        </p>
      </div>

      {/* Today stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Check-ins Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Guests arriving today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Check-outs Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Guests departing today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Currently staying
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Occupancy */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue This Month</CardTitle>
            <CardDescription>Total revenue from all properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0</div>
            <p className="text-sm text-muted-foreground mt-1">
              No revenue data yet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Rate</CardTitle>
            <CardDescription>Average across all listings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0%</div>
            <p className="text-sm text-muted-foreground mt-1">
              No occupancy data yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Health */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open Issues</CardTitle>
            <CardDescription>Issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-muted-foreground mt-1">
              All clear
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Health Score</CardTitle>
            <CardDescription>Overall property health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">—</div>
            <p className="text-sm text-muted-foreground mt-1">
              Not enough data
            </p>
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
          <Link
            href="/reservations"
            className={cn(buttonVariants())}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Reservation
          </Link>
          <Link
            href="/reservations"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Link>
          <Link
            href="/messages"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </Link>
          <Link
            href="/issues"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Report Issue
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
