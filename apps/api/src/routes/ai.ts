import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import { requireAuth } from "../middleware/auth";
import type { UserRole } from "@hostiq/shared";
import {
  generateReviewResponse,
  auditListing,
  detectComplaint,
  generateGuestMessage,
} from "../integrations/openai/client";

const ai = new Hono();

ai.use("*", requireAuth());

function getPropertyFilter(user: { userId: string; role: UserRole }) {
  if (user.role === "ADMIN" || user.role === "INTERNAL_OPS") {
    return {};
  }
  return { ownerId: user.userId };
}

function getPhotoCount(photosMeta: unknown): number {
  if (Array.isArray(photosMeta)) return photosMeta.length;
  if (photosMeta && typeof photosMeta === "object" && "count" in photosMeta) {
    const c = (photosMeta as { count?: number }).count;
    return typeof c === "number" ? c : 0;
  }
  return 0;
}

function getAmenitiesList(amenities: unknown): string[] {
  if (Array.isArray(amenities)) {
    return amenities.filter((a): a is string => typeof a === "string");
  }
  if (amenities && typeof amenities === "object") {
    return Object.values(amenities).filter((a): a is string => typeof a === "string");
  }
  return [];
}

// ============================================
// POST /ai/review-response - Generate AI review response
// ============================================
const reviewResponseSchema = z.object({
  rating: z.number().min(1).max(5),
  text: z.string(),
  guestName: z.string(),
  propertyName: z.string(),
});

ai.post("/review-response", async (c) => {
  const body = await c.req.json();
  const parsed = reviewResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  try {
    const response = await generateReviewResponse(parsed.data);
    return c.json({ success: true, response });
  } catch (err) {
    console.error("[AI] generateReviewResponse error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : "AI request failed" },
      500
    );
  }
});

// ============================================
// POST /ai/listing-audit - Audit a listing (fetches from DB by propertyId)
// ============================================
const listingAuditSchema = z.object({
  propertyId: z.string(),
});

ai.post("/listing-audit", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const parsed = listingAuditSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const filter = getPropertyFilter(user);
  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, ...filter },
    include: {
      listingsSnapshots: {
        orderBy: { snapshotDate: "desc" },
        take: 1,
      },
    },
  });

  if (!property) {
    return c.json({ success: false, error: "Property not found" }, 404);
  }

  const snapshot = property.listingsSnapshots[0];
  const listing = {
    title: snapshot?.title ?? property.name ?? "",
    description: snapshot?.description ?? "",
    amenities: getAmenitiesList(snapshot?.amenities ?? []),
    photos: getPhotoCount(snapshot?.photosMeta ?? null),
    houseRules: snapshot?.houseRules ?? "",
  };

  try {
    const result = await auditListing(listing);
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error("[AI] auditListing error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : "AI request failed" },
      500
    );
  }
});

// ============================================
// POST /ai/detect-complaint - Analyze message for complaints
// ============================================
const detectComplaintSchema = z.object({
  message: z.string(),
});

ai.post("/detect-complaint", async (c) => {
  const body = await c.req.json();
  const parsed = detectComplaintSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  try {
    const result = await detectComplaint(parsed.data.message);
    return c.json({ success: true, data: result });
  } catch (err) {
    console.error("[AI] detectComplaint error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : "AI request failed" },
      500
    );
  }
});

// ============================================
// POST /ai/generate-message - Generate guest message
// ============================================
const generateMessageSchema = z.object({
  guestName: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  propertyName: z.string(),
  type: z.enum(["welcome", "checkout_reminder", "review_request", "issue_followup"]),
});

ai.post("/generate-message", async (c) => {
  const body = await c.req.json();
  const parsed = generateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  try {
    const message = await generateGuestMessage(parsed.data);
    return c.json({ success: true, message });
  } catch (err) {
    console.error("[AI] generateGuestMessage error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : "AI request failed" },
      500
    );
  }
});

export default ai;
