import { syncListings } from "./sync-listings";
import { syncReservations } from "./sync-reservations";
import { syncMessages } from "./sync-messages";
import { syncReviews } from "./sync-reviews";
import { prisma } from "@hostiq/db";

const INTEGRATION = "hostify";

const INTERVALS = {
  listings: 60 * 60 * 1000,
  reservations: 5 * 60 * 1000,
  messages: 5 * 60 * 1000,
  reviews: 30 * 60 * 1000,
} as const;

let listingsTimer: ReturnType<typeof setInterval> | null = null;
let reservationsTimer: ReturnType<typeof setInterval> | null = null;
let messagesTimer: ReturnType<typeof setInterval> | null = null;
let reviewsTimer: ReturnType<typeof setInterval> | null = null;

async function runWithLogging(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  console.log(`[Scheduler] Starting ${name} at ${new Date().toISOString()}`);

  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`[Scheduler] ${name} completed in ${duration}ms`);

    await prisma.integrationHealth.upsert({
      where: { integration: INTEGRATION },
      update: {
        status: "healthy",
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        errorMessage: null,
      },
      create: {
        integration: INTEGRATION,
        status: "healthy",
        lastSuccessAt: new Date(),
      },
    });
  } catch (err) {
    const error = err as Error;
    const duration = Date.now() - start;
    console.error(`[Scheduler] ${name} failed after ${duration}ms:`, error.message);

    await prisma.integrationHealth.upsert({
      where: { integration: INTEGRATION },
      update: {
        status: "error",
        lastFailureAt: new Date(),
        errorMessage: error.message,
        consecutiveFailures: { increment: 1 },
      },
      create: {
        integration: INTEGRATION,
        status: "error",
        lastFailureAt: new Date(),
        errorMessage: error.message,
        consecutiveFailures: 1,
      },
    });
  }
}

export function startScheduler(): void {
  console.log("[Scheduler] Starting Hostify sync scheduler");

  runWithLogging("syncListings", syncListings).catch(() => {});
  listingsTimer = setInterval(() => {
    runWithLogging("syncListings", syncListings).catch(() => {});
  }, INTERVALS.listings);

  runWithLogging("syncReservations", syncReservations).catch(() => {});
  reservationsTimer = setInterval(() => {
    runWithLogging("syncReservations", syncReservations).catch(() => {});
  }, INTERVALS.reservations);

  runWithLogging("syncMessages", syncMessages).catch(() => {});
  messagesTimer = setInterval(() => {
    runWithLogging("syncMessages", syncMessages).catch(() => {});
  }, INTERVALS.messages);

  runWithLogging("syncReviews", syncReviews).catch(() => {});
  reviewsTimer = setInterval(() => {
    runWithLogging("syncReviews", syncReviews).catch(() => {});
  }, INTERVALS.reviews);

  console.log(
    "[Scheduler] Intervals: listings=60min, reservations=5min, messages=5min, reviews=30min"
  );
}

export function stopScheduler(): void {
  console.log("[Scheduler] Stopping Hostify sync scheduler");

  if (listingsTimer) {
    clearInterval(listingsTimer);
    listingsTimer = null;
  }
  if (reservationsTimer) {
    clearInterval(reservationsTimer);
    reservationsTimer = null;
  }
  if (messagesTimer) {
    clearInterval(messagesTimer);
    messagesTimer = null;
  }
  if (reviewsTimer) {
    clearInterval(reviewsTimer);
    reviewsTimer = null;
  }

  console.log("[Scheduler] Stopped");
}
