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
import { Star, Send, Sparkles, Loader2 } from "lucide-react";
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

// Sample data - fallback when no reviews API endpoint is available yet
const INITIAL_REVIEWS: Review[] = [
  {
    id: "1",
    guestName: "Sarah M.",
    rating: 5,
    text: "Absolutely wonderful stay! The property was spotless and the views were incredible. Would definitely book again.",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    propertyId: "1",
    propertyName: "Sunset Villa",
    response: "Thank you so much, Sarah! We're thrilled you enjoyed your stay. We'd love to host you again!",
    respondedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "2",
    guestName: "James K.",
    rating: 4,
    text: "Great location and clean. The only minor issue was the WiFi was a bit slow in the evenings.",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    propertyId: "1",
    propertyName: "Sunset Villa",
    response: null,
    respondedAt: null,
  },
  {
    id: "3",
    guestName: "Emily R.",
    rating: 5,
    text: "Perfect getaway! Everything was as described. The host was very responsive.",
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    propertyId: "2",
    propertyName: "Beach House",
    response: "Thank you, Emily! So glad you had a great time. Come back soon!",
    respondedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "4",
    guestName: "Michael T.",
    rating: 3,
    text: "Decent place but the check-in instructions were confusing. Had to call support.",
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    propertyId: "2",
    propertyName: "Beach House",
    response: null,
    respondedAt: null,
  },
];

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
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [filters, setFilters] = useState({
    propertyId: "",
    rating: "" as string,
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      setProperties(res.data ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filteredReviews = reviews.filter((r) => {
    if (filters.propertyId && r.propertyId !== filters.propertyId) return false;
    if (filters.rating && r.rating !== Number(filters.rating)) return false;
    if (filters.startDate && new Date(r.date) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(r.date) > new Date(filters.endDate)) return false;
    return true;
  });

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
      // Fallback to generic response
      const genericResponse =
        "Thank you for your feedback! We're glad you enjoyed your stay. We appreciate you taking the time to share your experience. We hope to welcome you back soon!";
      setResponseDrafts((d) => ({ ...d, [reviewId]: genericResponse }));
    } finally {
      setAiGeneratingId(null);
    }
  };

  const sendResponse = async (reviewId: string) => {
    const draft = responseDrafts[reviewId];
    if (!draft?.trim()) return;
    setSendingId(reviewId);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                response: draft,
                respondedAt: new Date().toISOString(),
              }
            : r
        )
      );
      setResponseDrafts((d) => {
        const next = { ...d };
        delete next[reviewId];
        return next;
      });
    } finally {
      setSendingId(null);
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
                {properties.length === 0 &&
                  [...new Set(reviews.map((r) => r.propertyId))].map((pid) => {
                    const r = reviews.find((x) => x.propertyId === pid);
                    return (
                      <option key={pid} value={pid}>
                        {r?.propertyName ?? pid}
                      </option>
                    );
                  })}
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
            {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredReviews.map((review) => (
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
                              onClick={() => sendResponse(review.id)}
                              disabled={
                                !responseDrafts[review.id]?.trim() || !!sendingId
                              }
                            >
                              {sendingId === review.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Send
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
            {filteredReviews.length === 0 && (
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
