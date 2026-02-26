import { prisma } from "@hostiq/db";
import { hostify } from "../integrations/hostify/client";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export async function backfillHostifyRawMessages(): Promise<void> {
  const start = Date.now();
  console.log(`[Backfill:HostifyRawMessages] Starting at ${new Date().toISOString()}`);

  const properties = await prisma.property.findMany({
    where: { hostifyListingId: { not: null } },
    select: { id: true, hostifyListingId: true },
  });

  let totalMessages = 0;

  for (const prop of properties) {
    const listingId = prop.hostifyListingId
      ? parseInt(prop.hostifyListingId, 10)
      : null;
    if (!listingId || isNaN(listingId)) continue;

    console.log(`[Backfill:HostifyRawMessages] Listing ${listingId}...`);
    const threads = await hostify.getInbox(listingId);

    for (const thread of threads) {
      const hostifyThreadId = String(thread.id);
      const fullThread = await hostify.getThread(thread.id as number);
      const messages = (fullThread.messages ?? []) as Array<Record<string, unknown>>;

      for (const msg of messages) {
        const rawId = msg.id;
        if (rawId == null) continue;
        const hostifyMessageId = String(rawId);
        const createdAt =
          parseDate(msg.created ?? msg.created_at ?? msg.createdAt) ?? null;

        await prisma.hostifyRawMessage.upsert({
          where: { hostifyMessageId },
          update: {
            hostifyThreadId,
            hostifyListingId: String(listingId),
            hostifyReservationId: thread.reservation_id
              ? String(thread.reservation_id)
              : null,
            hostifyGuestId: thread.guest_id ? String(thread.guest_id) : null,
            createdAt,
            payload: msg as Record<string, unknown>,
            source: "hostify",
          },
          create: {
            hostifyMessageId,
            hostifyThreadId,
            hostifyListingId: String(listingId),
            hostifyReservationId: thread.reservation_id
              ? String(thread.reservation_id)
              : null,
            hostifyGuestId: thread.guest_id ? String(thread.guest_id) : null,
            createdAt,
            payload: msg as Record<string, unknown>,
            source: "hostify",
          },
        });

        totalMessages++;
        if (totalMessages % 500 === 0) {
          console.log(`[Backfill:HostifyRawMessages] ${totalMessages} messages captured...`);
        }
      }
    }
  }

  const duration = Date.now() - start;
  console.log(
    `[Backfill:HostifyRawMessages] Completed in ${duration}ms. Total messages: ${totalMessages}`
  );
}
