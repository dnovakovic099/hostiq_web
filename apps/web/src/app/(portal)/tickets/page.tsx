import { Card, CardContent } from "@/components/ui/card";
import { Ticket } from "lucide-react";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Tickets</h1>
        <p>Support tickets and help requests</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
