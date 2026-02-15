import { prisma, Prisma } from "@hostiq/db";
import { hostify } from "../integrations/hostify/client";

const EVENT_TYPE = "review.received";

export async function syncReviews(): Promise<void> {
  const start = Date.now();
  console.log(`[Sync:Reviews] Starting sync at ${new Date().toISOString()}`);

  try {
    const rawReviews = await hostify.getReviews();
    let created = 0;

    for (const raw of rawReviews) {
      const hostifyReviewId = String(raw.id);

      const existing = await prisma.automationRun.findFirst({
        where: {
          eventType: EVENT_TYPE,
          eventPayload: {
            path: ["hostify_review_id"],
            equals: hostifyReviewId,
          },
        },
      });

      if (existing) {
        continue;
      }

      const payload = {
        hostify_review_id: hostifyReviewId,
        listing_id: raw.listing_id,
        reservation_id: raw.reservation_id,
        rating: raw.rating,
        text: (raw.text ?? raw.review_text) as string | undefined,
        response: raw.response,
        created_at: raw.created_at,
        ...raw,
      };

      await prisma.automationRun.create({
        data: {
          eventType: EVENT_TYPE,
          eventPayload: payload as Prisma.InputJsonValue,
          outcome: "received",
        },
      });

      created++;
    }

    const duration = Date.now() - start;
    console.log(`[Sync:Reviews] Completed in ${duration}ms: ${created} new reviews logged`);
  } catch (err) {
    const error = err as Error;
    console.error(`[Sync:Reviews] Failed:`, error.message);
    throw error;
  }
}
