import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import { hostify } from "../integrations/hostify/client";
import type { UserRole } from "@hostiq/shared";

const reviews = new Hono();

reviews.use("*", requireAuth());

const listQuerySchema = z.object({
  propertyId: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function firstNonEmptyValueAsString(values: unknown[]): string | null {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function toISOStringSafe(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ============================================
// GET /reviews - Fetch live reviews from Hostify
// ============================================
reviews.get("/", async (c) => {
  const user = c.get("user");
  const filter = getPropertyFilter(user);

  const query = listQuerySchema.safeParse({
    propertyId: c.req.query("propertyId"),
    rating: c.req.query("rating"),
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
  });
  const params = query.success ? query.data : listQuerySchema.parse({});

  const properties = await prisma.property.findMany({
    where: filter,
    select: { id: true, name: true, hostifyListingId: true },
  });

  const propertyByHostifyListing = new Map<string, { id: string; name: string }>();
  for (const p of properties) {
    if (p.hostifyListingId) {
      propertyByHostifyListing.set(String(p.hostifyListingId), { id: p.id, name: p.name });
    }
  }

  const rawReviews = await hostify.getReviews();

  const items = rawReviews
    .map((raw, idx) => {
      const rawObj = raw as Record<string, unknown>;
      const listingIdRaw = firstNonEmptyValueAsString([
        rawObj.listing_id,
        rawObj.listingId,
        rawObj.listing,
      ]);
      const property = listingIdRaw ? propertyByHostifyListing.get(listingIdRaw) : null;

      if (!property) return null;

      const rating = toNumber(rawObj.rating) ?? 0;
      const dateIso =
        toISOStringSafe(rawObj.created) ??
        toISOStringSafe(rawObj.created_at) ??
        toISOStringSafe(rawObj.createdAt) ??
        new Date().toISOString();

      const text = firstNonEmptyString([
        rawObj.comments,
        rawObj.text,
        rawObj.review_text,
        rawObj.content,
        rawObj.body,
      ]) ?? "";

      const responseText = firstNonEmptyString([
        rawObj.response,
        rawObj.response_text,
        rawObj.host_response,
      ]);

      const guestName =
        firstNonEmptyString([
          rawObj.guest_name,
          rawObj.guestName,
          rawObj.guest,
          rawObj.author_name,
          rawObj.reviewer_name,
        ]) ?? "Guest";

      return {
        id: String(rawObj.id ?? `hostify-review-${idx}`),
        guestName,
        rating,
        text,
        date: dateIso,
        propertyId: property.id,
        propertyName: property.name,
        response: responseText,
        respondedAt:
          toISOStringSafe(rawObj.responded_at) ??
          toISOStringSafe(rawObj.response_date) ??
          (responseText ? dateIso : null),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => {
      if (params.propertyId && item.propertyId !== params.propertyId) return false;
      if (params.rating && item.rating !== params.rating) return false;
      if (params.startDate && new Date(item.date) < new Date(params.startDate)) return false;
      if (params.endDate && new Date(item.date) > new Date(params.endDate)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return c.json({ success: true, data: { items } });
});

export default reviews;
