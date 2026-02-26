import { prisma } from "@hostiq/db";

type SenderType = "GUEST" | "HOST" | "AUTOMATION" | "SYSTEM";
import { hostify } from "../integrations/hostify/client";
import { processNewGuestMessage } from "../services/chatbot";

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
  if (!s) {
    return "SYSTEM";
  }
  if (
    s.includes("guest") ||
    s.includes("traveler") ||
    s.includes("booker") ||
    s.includes("tenant") ||
    s.includes("renter") ||
    s === "guest"
  ) {
    return "GUEST";
  }
  if (
    s.includes("host") ||
    s.includes("owner") ||
    s.includes("manager") ||
    s.includes("agent") ||
    s.includes("staff") ||
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
  return "SYSTEM";
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

      // Try to find guest by hostify guest ID, or create from thread data
      let guestId: string | null = null;
      const rawGuestId = raw.guest_id as string | number | undefined;
      const rawGuestName = (raw.guest_name ?? raw.guest_first_name) as string | undefined;
      const rawGuestEmail = raw.guest_email as string | undefined;
      const rawGuestPhone = raw.guest_phone as string | undefined;

      if (rawGuestId) {
        const existingGuest = await prisma.guest.findFirst({
          where: { hostifyGuestId: String(rawGuestId) },
        });
        if (existingGuest) {
          guestId = existingGuest.id;
          // Update name if we have it now and didn't before
          if (rawGuestName && !existingGuest.name) {
            await prisma.guest.update({
              where: { id: existingGuest.id },
              data: { name: rawGuestName, email: rawGuestEmail ?? existingGuest.email, phone: rawGuestPhone ?? existingGuest.phone },
            });
          }
        } else if (rawGuestName || rawGuestEmail) {
          // Create guest record from thread data
          const newGuest = await prisma.guest.create({
            data: {
              hostifyGuestId: String(rawGuestId),
              name: rawGuestName ?? null,
              email: rawGuestEmail ?? null,
              phone: rawGuestPhone ?? null,
            },
          });
          guestId = newGuest.id;
          console.log(`[Sync:Messages] Created guest ${newGuest.id} (${rawGuestName}) from thread data`);
        }
      }

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
      const messages = (fullThread.messages ?? []) as Array<Record<string, unknown>>;

      for (const msg of messages) {
        const rawId = msg.id;
        if (rawId == null) continue;

        const hostifyMessageId = String(rawId);
        const content = String(msg.body ?? msg.message ?? "");
        const createdAt =
          parseDate(msg.created ?? msg.created_at ?? msg.createdAt) ?? new Date();
        const senderType = inferSenderType(msg.from);

        const upserted = await prisma.message.upsert({
          where: { hostifyMessageId },
          update: {
            senderType,
            content: content || "(empty)",
            createdAt,
          },
          create: {
            threadId: thread.id,
            hostifyMessageId,
            senderType,
            content: content || "(empty)",
            createdAt,
          },
        });

        // Trigger AI suggestion for new guest messages (fire and forget)
        if (senderType === "GUEST") {
          const hasAiStatus = await prisma.messageAiStatus.findUnique({
            where: { messageId: upserted.id },
            select: { id: true },
          });
          if (!hasAiStatus) {
            processNewGuestMessage(thread.id, upserted.id).catch((err) => {
              console.error(`[Sync:Messages] AI suggestion failed for ${upserted.id}:`, (err as Error).message);
            });
          }
        }

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
