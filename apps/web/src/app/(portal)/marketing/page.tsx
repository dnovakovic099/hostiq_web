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

const PAGE_SIZE = 12;

export default function MarketingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [listingHealth, setListingHealth] = useState<ListingHealth[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      const items = res.data ?? [];
      setProperties(items);
      // Generate listing health entries from real properties data
      setListingHealth(
        items.map((p) => ({
          propertyId: p.id,
          propertyName: p.name,
          listingScore: 75,
          issuesCount: 0,
          lastAuditedAt: null as string | null,
        }))
      );
    } catch {
      setProperties([]);
      setListingHealth([]);
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
    setAuditError(null);
    try {
      const res = await api.post<{ success: boolean; data: AuditResult }>("/ai/listing-audit", {
        propertyId,
      });
      const raw = res?.data;
      // Provide safe defaults so a malformed/partial response never crashes
      const result: AuditResult = {
        titleSuggestions: Array.isArray(raw?.titleSuggestions) ? raw.titleSuggestions : [],
        descriptionScore: typeof raw?.descriptionScore === "number" ? raw.descriptionScore : 0,
        photoCount: typeof raw?.photoCount === "number" ? raw.photoCount : 0,
        photoQualityNotes: raw?.photoQualityNotes ?? "N/A",
        amenityCompleteness: typeof raw?.amenityCompleteness === "number" ? raw.amenityCompleteness : 0,
        competitorComparison: raw?.competitorComparison ?? "N/A",
      };
      setAuditResult(result);
      // Update listing health with audit results
      setListingHealth((prev) =>
        prev.map((h) =>
          h.propertyId === propertyId
            ? {
                ...h,
                lastAuditedAt: new Date().toISOString(),
                listingScore: result.descriptionScore,
                issuesCount: result.titleSuggestions.length,
              }
            : h
        )
      );
    } catch (error) {
      setAuditError(
        error instanceof Error ? error.message : "Failed to run audit. Please try again."
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
        <div className="page-header">
          <h1>Marketing</h1>
          <p>Listing health audit and optimization tips</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-muted/40 skeleton" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pageCount = Math.ceil(listingHealth.length / PAGE_SIZE);
  const pagedListings = listingHealth.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Marketing</h1>
        <p>Listing health audit and optimization tips</p>
      </div>

      {/* Listing Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pagedListings.map((h) => (
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

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, listingHealth.length)} of {listingHealth.length} listings
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
            {auditError && !auditLoading && (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">{auditError}</p>
              </div>
            )}
            {auditResult && !auditLoading && !auditError && (
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
