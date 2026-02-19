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
  ImageIcon,
  TrendingUp,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

interface Property {
  id: string;
  name: string;
  photosMeta?: unknown;
}

interface ListingHealth {
  propertyId: string;
  propertyName: string;
  thumbnailUrl: string | null;
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

function extractThumbnail(photosMeta: unknown): string | null {
  if (!photosMeta) return null;

  if (Array.isArray(photosMeta)) {
    for (const item of photosMeta) {
      if (typeof item === "string" && item.startsWith("http")) return item;
      if (item && typeof item === "object") {
        const url =
          (item as Record<string, unknown>).url ??
          (item as Record<string, unknown>).original ??
          (item as Record<string, unknown>).thumbnail ??
          (item as Record<string, unknown>).src ??
          (item as Record<string, unknown>).image;
        if (typeof url === "string" && url.startsWith("http")) return url;
      }
    }
  }

  if (typeof photosMeta === "object" && photosMeta !== null) {
    const meta = photosMeta as Record<string, unknown>;
    if (typeof meta.url === "string") return meta.url;
    if (Array.isArray(meta.photos)) return extractThumbnail(meta.photos);
    if (Array.isArray(meta.images)) return extractThumbnail(meta.images);
  }

  return null;
}

const MARKETING_TIPS = [
  {
    title: "Optimize your title",
    description:
      "Include location, key amenities, and unique selling points in the first 50 characters.",
    icon: TrendingUp,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "High-quality photos",
    description:
      "Use professional photos with good lighting. First 5 photos matter most.",
    icon: ImageIcon,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    title: "Complete amenities",
    description:
      "List all amenities accurately. Missing items can hurt your search ranking.",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Respond quickly",
    description:
      "Guests expect fast responses. Aim for under 1 hour during peak hours.",
    icon: Star,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const PAGE_SIZE = 12;

export default function MarketingPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [listingHealth, setListingHealth] = useState<ListingHealth[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>(
        "/properties"
      );
      const items = res.data ?? [];
      setProperties(items);
      setListingHealth(
        items.map((p) => ({
          propertyId: p.id,
          propertyName: p.name,
          thumbnailUrl: extractThumbnail(p.photosMeta),
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
      const res = await api.post<{ success: boolean; data: AuditResult }>(
        "/ai/listing-audit",
        { propertyId }
      );
      const raw = res?.data;
      const result: AuditResult = {
        titleSuggestions: Array.isArray(raw?.titleSuggestions)
          ? raw.titleSuggestions
          : [],
        descriptionScore:
          typeof raw?.descriptionScore === "number" ? raw.descriptionScore : 0,
        photoCount:
          typeof raw?.photoCount === "number" ? raw.photoCount : 0,
        photoQualityNotes: raw?.photoQualityNotes ?? "N/A",
        amenityCompleteness:
          typeof raw?.amenityCompleteness === "number"
            ? raw.amenityCompleteness
            : 0,
        competitorComparison: raw?.competitorComparison ?? "N/A",
      };
      setAuditResult(result);
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
        error instanceof Error
          ? error.message
          : "Failed to run audit. Please try again."
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-500";
    if (score >= 70) return "text-amber-500";
    return "text-rose-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  const filteredListings = searchQuery
    ? listingHealth.filter((h) =>
        h.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : listingHealth;

  const pageCount = Math.ceil(filteredListings.length / PAGE_SIZE);
  const pagedListings = filteredListings.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Marketing</h1>
          <p>Listing health audit and optimization tips</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-muted/40 skeleton"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="flex items-center gap-2.5">
            Marketing
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Sparkles className="h-3 w-3" />
              AI-Powered
            </span>
          </h1>
          <p>Listing health audit and optimization tips</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search listings..."
            className="w-full rounded-lg border border-border/60 bg-card pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/[0.06] via-card to-violet-500/[0.05]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/[0.08] blur-3xl" />
        <CardContent className="relative py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Total Listings
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {listingHealth.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Synced from your PMS
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Avg Listing Score
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {listingHealth.length
                  ? Math.round(
                      listingHealth.reduce((s, h) => s + h.listingScore, 0) /
                        listingHealth.length
                    )
                  : 0}
                %
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Run audits to improve
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/70 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Audited
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {listingHealth.filter((h) => h.lastAuditedAt).length} /{" "}
                {listingHealth.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Listings analyzed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listing Cards */}
      {pagedListings.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              No listings found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {searchQuery
                ? "Try a different search term"
                : "Properties will appear once synced from your PMS"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedListings.map((h) => {
            const isSelected = selectedPropertyId === h.propertyId;
            return (
              <Card
                key={h.propertyId}
                className={cn(
                  "group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30",
                  isSelected && "ring-2 ring-primary border-primary/40"
                )}
              >
                {/* Image */}
                <div className="relative h-40 w-full overflow-hidden bg-muted/30">
                  {h.thumbnailUrl ? (
                    <img
                      src={h.thumbnailUrl}
                      alt={h.propertyName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  {/* Score overlay */}
                  <div className="absolute top-3 right-3">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md",
                        h.listingScore >= 85
                          ? "bg-emerald-500/90 text-white"
                          : h.listingScore >= 70
                            ? "bg-amber-500/90 text-white"
                            : "bg-rose-500/90 text-white"
                      )}
                    >
                      {h.listingScore}%
                    </div>
                  </div>
                  {h.lastAuditedAt && (
                    <div className="absolute top-3 left-3">
                      <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                        <CheckCircle2 className="h-3 w-3" />
                        Audited
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                      {h.propertyName}
                    </h3>
                  </div>

                  {/* Score bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Listing Score
                      </span>
                      <span
                        className={cn("font-bold", getScoreColor(h.listingScore))}
                      >
                        {h.listingScore}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getScoreBg(h.listingScore)
                        )}
                        style={{ width: `${h.listingScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {h.issuesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          {h.issuesCount} issue{h.issuesCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">
                          {h.lastAuditedAt
                            ? `Audited ${new Date(h.lastAuditedAt).toLocaleDateString()}`
                            : "Not yet audited"}
                        </span>
                      )}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelected && auditResult ? "outline" : "default"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      runAudit(h.propertyId);
                    }}
                    disabled={auditLoading}
                  >
                    {auditLoading && selectedPropertyId === h.propertyId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-2" />
                        Run Audit
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="text-xs">
            Showing {page * PAGE_SIZE + 1}&ndash;
            {Math.min((page + 1) * PAGE_SIZE, filteredListings.length)} of{" "}
            {filteredListings.length} listings
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Audit Results */}
      {selectedPropertyId && (
        <Card className="border-border/40 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4.5 w-4.5 text-primary" />
                  Audit Results
                </CardTitle>
                <CardDescription className="mt-1">
                  {auditResult
                    ? listingHealth.find(
                        (h) => h.propertyId === selectedPropertyId
                      )?.propertyName ?? "Property"
                    : auditLoading
                      ? "Running AI audit..."
                      : "Click Run Audit to analyze this listing"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setSelectedPropertyId(null);
                  setAuditResult(null);
                  setAuditError(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {auditLoading && !auditResult && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing listing with AI...
                </p>
              </div>
            )}
            {auditError && !auditLoading && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{auditError}</p>
              </div>
            )}
            {auditResult && !auditLoading && !auditError && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Title Suggestions
                  </h4>
                  {auditResult.titleSuggestions.length > 0 ? (
                    <ul className="space-y-1.5">
                      {auditResult.titleSuggestions.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground/60">
                      No suggestions — title looks good!
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Description Quality</h4>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getScoreBg(auditResult.descriptionScore)
                        )}
                        style={{ width: `${auditResult.descriptionScore}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        getScoreColor(auditResult.descriptionScore)
                      )}
                    >
                      {auditResult.descriptionScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-violet-500" />
                    Photos
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {auditResult.photoCount}
                    </span>{" "}
                    photos &middot; {auditResult.photoQualityNotes}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Amenity Completeness
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          getScoreBg(auditResult.amenityCompleteness)
                        )}
                        style={{
                          width: `${auditResult.amenityCompleteness}%`,
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        getScoreColor(auditResult.amenityCompleteness)
                      )}
                    >
                      {auditResult.amenityCompleteness}%
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Competitor Comparison
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {auditResult.competitorComparison}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marketing Tips */}
      <Card className="border-border/40">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4.5 w-4.5 text-amber-500" />
            Optimization Tips
          </CardTitle>
          <CardDescription>
            Best practices to improve your listing performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {MARKETING_TIPS.map((tip) => (
              <div
                key={tip.title}
                className="flex gap-3.5 rounded-xl border border-border/40 bg-card p-4 transition-colors hover:bg-muted/20"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    tip.bg
                  )}
                >
                  <tip.icon className={cn("h-5 w-5", tip.color)} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{tip.title}</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
