import { prisma } from "@hostiq/db";

type SenderType = "GUEST" | "HOST" | "SYSTEM";
import { hostify } from "../integrations/hostify/client";

const INTEGRATION = "hostify";
const ENTITY_TYPE = "messages";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const str = String(val);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function inferSenderType(sender: unknown): SenderType {
  const s = String(sender ?? "").toLowerCase();
  if (
    s.includes("guest") ||
    s.includes("traveler") ||
    s.includes("booker") ||
    s === "guest"
  ) {
    return "GUEST";
  }
  if (
    s.includes("host") ||
    s.includes("owner") ||
    s.includes("manager") ||
    s === "host"
  ) {
    return "HOST";
  }
  if (
    s.includes("auto") ||
    s.includes("bot") ||
    s.includes("automation") ||
    s.includes("system")
  ) {
    return "AUTOMATION";
  }
  return "GUEST";
}

export async function syncMessages(): Promise<void> {
  const start = Date.now();
  console.log(`[Sync:Messages] Starting sync at ${new Date().toISOString()}`);

  try {
    const properties = await prisma.property.findMany({
      where: { hostifyListingId: { not: null } },
      select: { id: true, hostifyListingId: true },
    });

    let totalThreads = 0;
    let totalMessages = 0;

    for (const prop of properties) {
      const listingId = prop.hostifyListingId
        ? parseInt(prop.hostifyListingId, 10)
        : null;
      if (!listingId || isNaN(listingId)) continue;

      const { threads, messages } = await syncMessagesForProperty(prop.id, listingId);
      totalThreads += threads;
      totalMessages += messages;
    }

    await prisma.syncCheckpoint.upsert({
      where: {
        integration_entityType: { integration: INTEGRATION, entityType: ENTITY_TYPE },
      },
      update: {
        totalSynced: totalMessages,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        integration: INTEGRATION,
        entityType: ENTITY_TYPE,
        totalSynced: totalMessages,
        completedAt: new Date(),
      },
    });

    const duration = Date.now() - start;
    console.log(
      `[Sync:Messages] Completed in ${duration}ms: ${totalThreads} threads, ${totalMessages} messages`
    );
  } catch (err) {
    const error = err as Error;
    console.error(`[Sync:Messages] Failed:`, error.message);
    throw error;
  }
}

export async function syncMessagesForProperty(
  propertyId: string,
  hostifyListingId: number
): Promise<{ threads: number; messages: number }> {
  try {
    const rawThreads = await hostify.getInbox(hostifyListingId);
    let threadCount = 0;
    let messageCount = 0;

    for (const raw of rawThreads) {
      const hostifyThreadId = String(raw.id);
      const reservationId = raw.reservation_id
        ? await prisma.reservation
            .findFirst({
              where: {
                propertyId,
                hostifyReservationId: String(raw.reservation_id),
              },
              select: { id: true },
            })
            .then((r) => r?.id ?? null)
        : null;

      const guestId = raw.guest_id
        ? await prisma.guest
            .findFirst({
              where: { hostifyGuestId: String(raw.guest_id) },
              select: { id: true },
            })
            .then((g) => g?.id ?? null)
        : null;

      const thread = await prisma.messageThread.upsert({
        where: { hostifyThreadId },
        update: {
          reservationId: reservationId ?? undefined,
          guestId: guestId ?? undefined,
          lastMessageAt: parseDate(raw.updated_at ?? raw.last_message_at) ?? undefined,
        },
        create: {
          propertyId,
          hostifyThreadId,
          reservationId,
          guestId,
          lastMessageAt: parseDate(raw.updated_at ?? raw.last_message_at) ?? undefined,
        },
      });

      threadCount++;

      const fullThread = await hostify.getThread(raw.id);
      const messages = (fullThread.messages ?? []) as Array<{
        id: number;
        sender?: string;
        body?: string;
        message?: string;
        created_at?: string;
      }>;

      for (const msg of messages) {
        const hostifyMessageId = String(msg.id);
        const content = (msg.body ?? msg.message ?? "") as string;
        const createdAt = parseDate(msg.created_at) ?? new Date();
        const senderType = inferSenderType(msg.sender);

        await prisma.message.upsert({
          where: { hostifyMessageId },
          update: {},
          create: {
            threadId: thread.id,
            hostifyMessageId,
            senderType,
            content: content || "(empty)",
            createdAt,
          },
        });

        messageCount++;
      }

      const lastMsg = messages[messages.length - 1];
      const lastMessageAt = lastMsg
        ? parseDate(lastMsg.created_at)
        : null;

      if (lastMessageAt) {
        await prisma.messageThread.update({
          where: { id: thread.id },
          data: { lastMessageAt },
        });
      }
    }

    return { threads: threadCount, messages: messageCount };
  } catch (err) {
    const error = err as Error;
    console.error(
      `[Sync:Messages] Failed for property ${propertyId}:`,
      error.message
    );
    throw error;
  }
}
