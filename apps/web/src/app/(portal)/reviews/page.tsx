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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Star, Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Property {
  id: string;
  name: string;
}

interface Review {
  id: string;
  guestName: string;
  rating: number;
  text: string;
  date: string;
  propertyId: string;
  propertyName: string;
  response: string | null;
  respondedAt: string | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= rating ? "fill-amber-400 text-amber-400" : "text-muted"
          )}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filters, setFilters] = useState({
    propertyId: "",
    rating: "" as string,
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      setProperties(res.data ?? []);
    } catch {
      setProperties([]);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.rating) params.set("rating", filters.rating);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await api.get<{ success: boolean; data: { items: Review[] } }>(
        `/reviews?${params.toString()}`
      );
      setReviews(res.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
      setReviews([]);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProperties(), fetchReviews()]).finally(() => setLoading(false));
  }, [fetchProperties, fetchReviews]);

  const stats = {
    avgRating:
      reviews.length > 0
        ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
        : 0,
    totalReviews: reviews.length,
    fiveStarPct:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === 5).length / reviews.length) * 100
        : 0,
    responseRate:
      reviews.length > 0
        ? (reviews.filter((r) => r.response).length / reviews.length) * 100
        : 0,
  };

  const generateAiResponse = async (reviewId: string) => {
    setAiGeneratingId(reviewId);
    setAiErrors((e) => {
      const next = { ...e };
      delete next[reviewId];
      return next;
    });
    try {
      const review = reviews.find((r) => r.id === reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      const res = await api.post<{ success: boolean; response?: string; error?: string }>(
        "/ai/review-response",
        {
          rating: review.rating,
          text: review.text,
          guestName: review.guestName,
          propertyName: review.propertyName,
        }
      );

      if (res.success && res.response) {
        setResponseDrafts((d) => ({ ...d, [reviewId]: res.response! }));
      } else {
        throw new Error(res.error ?? "Invalid response from AI service");
      }
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      setAiErrors((e) => ({
        ...e,
        [reviewId]: "Failed to generate AI response. Please try again or write your own response.",
      }));
    } finally {
      setAiGeneratingId(null);
    }
  };

  const copyResponse = async (reviewId: string) => {
    const draft = responseDrafts[reviewId];
    if (!draft?.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedId(reviewId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = draft;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(reviewId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Reviews</h1>
          <p>Manage guest reviews and AI-powered responses</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded bg-muted/60 skeleton" />
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/40 skeleton" />
                ))}
              </div>
              <div className="h-48 rounded-lg bg-muted/30 skeleton" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Reviews</h1>
          <p>Manage guest reviews and AI-powered responses</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Reviews</h1>
        <p>Manage guest reviews and AI-powered responses</p>
      </div>

      {/* Review Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold">
                {stats.avgRating.toFixed(1)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">5-Star %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fiveStarPct.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responseRate.toFixed(0)}%</div>
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
                onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}
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
              <label className="text-sm font-medium mb-1 block">Rating</label>
              <select
                className="filter-select w-full"
                value={filters.rating}
                onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value }))}
              >
                <option value="">All</option>
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">Start date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm font-medium mb-1 block">End date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b pb-6 last:border-0 last:pb-0"
              >
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>
                      {review.guestName[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{review.guestName}</span>
                      <StarRating rating={review.rating} />
                      <Badge variant="outline" className="text-xs">
                        {review.propertyName}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{review.text}</p>
                    {review.response ? (
                      <div className="mt-4 pl-4 border-l-2 border-primary/30">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Your response
                        </p>
                        <p className="text-sm">{review.response}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {review.respondedAt &&
                            new Date(review.respondedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Badge variant="destructive" className="text-xs">
                          Needs Response
                        </Badge>
                        <div className="mt-3 space-y-2">
                          <textarea
                            className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
                            placeholder="Write your response..."
                            value={responseDrafts[review.id] ?? ""}
                            onChange={(e) =>
                              setResponseDrafts((d) => ({
                                ...d,
                                [review.id]: e.target.value,
                              }))
                            }
                          />
                          {aiErrors[review.id] && (
                            <p className="text-sm text-destructive">{aiErrors[review.id]}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => generateAiResponse(review.id)}
                              disabled={!!aiGeneratingId}
                              variant="outline"
                            >
                              {aiGeneratingId === review.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  Generate Response
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant={copiedId === review.id ? "outline" : "default"}
                              onClick={() => copyResponse(review.id)}
                              disabled={!responseDrafts[review.id]?.trim()}
                            >
                              {copiedId === review.id ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy Response
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="py-12 text-center">
                <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No reviews match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
