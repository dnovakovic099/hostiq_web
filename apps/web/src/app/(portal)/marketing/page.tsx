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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface Property {
  id: string;
  name: string;
}

interface ListingHealth {
  propertyId: string;
  propertyName: string;
  thumbnailUrl?: string;
  listingScore: number;
  issuesCount: number;
  lastAuditedAt: string | null;
}

interface AuditResult {
  titleSuggestions: string[];
  descriptionScore: number;
  photoCount: number;
  photoQualityNotes: string;
  amenityCompleteness: number;
  competitorComparison: string;
}

const MOCK_LISTING_HEALTH: ListingHealth[] = [
  {
    propertyId: "1",
    propertyName: "Sunset Villa",
    listingScore: 78,
    issuesCount: 3,
    lastAuditedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    propertyId: "2",
    propertyName: "Beach House",
    listingScore: 92,
    issuesCount: 1,
    lastAuditedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    propertyId: "3",
    propertyName: "Mountain Retreat",
    listingScore: 65,
    issuesCount: 5,
    lastAuditedAt: null,
  },
];

const MOCK_AUDIT_RESULT: AuditResult = {
  titleSuggestions: [
    "Add location: 'Stunning Ocean View Villa - Walk to Beach'",
    "Include key amenity: 'Pool, WiFi, Parking'",
    "Consider adding 'Pet-Friendly' if applicable",
  ],
  descriptionScore: 72,
  photoCount: 18,
  photoQualityNotes: "3 photos could be brighter. Consider adding sunset/dusk shots.",
  amenityCompleteness: 85,
  competitorComparison: "Your listing ranks in top 40% for similar properties in the area.",
};

const MARKETING_TIPS = [
  {
    title: "Optimize your title",
    description: "Include location, key amenities, and unique selling points in the first 50 characters.",
    icon: BarChart3,
  },
  {
    title: "High-quality photos",
    description: "Use professional photos with good lighting. First 5 photos matter most.",
    icon: Sparkles,
  },
  {
    title: "Complete amenities",
    description: "List all amenities accurately. Missing items can hurt your search ranking.",
    icon: CheckCircle2,
  },
  {
    title: "Respond quickly",
    description: "Guests expect fast responses. Aim for under 1 hour during peak hours.",
    icon: Lightbulb,
  },
];

export default function MarketingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [listingHealth, setListingHealth] = useState<ListingHealth[]>(MOCK_LISTING_HEALTH);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      const items = res.data ?? [];
      setProperties(items);
      if (items.length > 0) {
        setListingHealth((prev) => {
          const existingIds = new Set(prev.map((h) => h.propertyId));
          const newItems = items
            .filter((p) => !existingIds.has(p.id))
            .map((p) => ({
              propertyId: p.id,
              propertyName: p.name,
              listingScore: 75,
              issuesCount: 0,
              lastAuditedAt: null as string | null,
            }));
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
      }
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const runAudit = async (propertyId: string) => {
    setAuditLoading(true);
    setSelectedPropertyId(propertyId);
    setAuditResult(null);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setAuditResult(MOCK_AUDIT_RESULT);
      setListingHealth((prev) =>
        prev.map((h) =>
          h.propertyId === propertyId
            ? {
                ...h,
                lastAuditedAt: new Date().toISOString(),
                listingScore: MOCK_AUDIT_RESULT.descriptionScore + 10,
                issuesCount: 3,
              }
            : h
        )
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing</h1>
        <p className="text-muted-foreground">Listing health audit and optimization tips</p>
      </div>

      {/* Listing Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listingHealth.map((h) => (
          <Card
            key={h.propertyId}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary/50",
              selectedPropertyId === h.propertyId && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedPropertyId(h.propertyId)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{h.propertyName}</CardTitle>
                  {h.thumbnailUrl ? (
                    <img
                      src={h.thumbnailUrl}
                      alt=""
                      className="mt-2 h-20 w-full object-cover rounded"
                    />
                  ) : (
                    <div className="mt-2 h-20 w-full bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Listing Score</span>
                <span className={cn("font-bold", getScoreColor(h.listingScore))}>
                  {h.listingScore}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Issues found</span>
                <Badge variant={h.issuesCount > 0 ? "destructive" : "secondary"}>
                  {h.issuesCount}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Last audited:{" "}
                {h.lastAuditedAt
                  ? new Date(h.lastAuditedAt).toLocaleDateString()
                  : "Never"}
              </p>
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  runAudit(h.propertyId);
                }}
                disabled={auditLoading}
              >
                {auditLoading && selectedPropertyId === h.propertyId ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Running audit...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Audit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Results Section */}
      {selectedPropertyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Audit Results
            </CardTitle>
            <CardDescription>
              {auditResult
                ? `Results for ${listingHealth.find((h) => h.propertyId === selectedPropertyId)?.propertyName ?? "property"}`
                : auditLoading
                  ? "Running AI audit..."
                  : "Click Run Audit to analyze this listing"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading && !auditResult && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {auditResult && !auditLoading && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Title optimization suggestions
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {auditResult.titleSuggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Description quality score</h4>
                  <div className="flex items-center gap-2">
                    <div className="h-3 flex-1 max-w-[200px] bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary rounded"
                        style={{ width: `${auditResult.descriptionScore}%` }}
                      />
                    </div>
                    <span className="font-bold">{auditResult.descriptionScore}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Photo analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Count: {auditResult.photoCount} • {auditResult.photoQualityNotes}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Amenity completeness</h4>
                  <p className="text-sm text-muted-foreground">
                    {auditResult.amenityCompleteness}%
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Competitor comparison</h4>
                  <p className="text-sm text-muted-foreground">
                    {auditResult.competitorComparison}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marketing Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Marketing Tips
          </CardTitle>
          <CardDescription>Best practices for listing optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {MARKETING_TIPS.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="shrink-0">
                  <tip.icon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
