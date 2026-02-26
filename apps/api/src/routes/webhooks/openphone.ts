import { Hono } from "hono";
import { prisma } from "@hostiq/db";
import { processNewGuestMessage } from "../../services/chatbot";

const openphoneWebhooks = new Hono();

/**
 * POST /webhooks/openphone
 * Receives OpenPhone webhook events (message.received, message.sent, etc.)
 * Docs: https://support.openphone.com/hc/en-us/articles/4690543507607-Webhooks
 */
openphoneWebhooks.post("/", async (c) => {
  const body = await c.req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[Webhook:OpenPhone] Invalid JSON body");
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const eventType = payload.type as string | undefined;
  const data = payload.data as Record<string, unknown> | undefined;

  if (!eventType || !data) {
    console.warn("[Webhook:OpenPhone] Missing type or data in payload");
    return c.json({ success: true });
  }

  console.log(`[Webhook:OpenPhone] Received event: ${eventType}`);

  // Handle message events
  if (eventType === "message.received" || eventType === "message.sent") {
    const direction = data.direction as string; // "incoming" or "outgoing"
    const content = data.body as string || data.text as string || "";
    const from = data.from as string;
    const to = Array.isArray(data.to) ? (data.to as string[])[0] : (data.to as string);
    const openphoneMessageId = data.id as string;
    const createdAtRaw = data.createdAt as string;
    const createdAt = createdAtRaw ? new Date(createdAtRaw) : new Date();

    // Determine guest phone (the external party)
    const isIncoming = direction === "incoming" || eventType === "message.received";
    const guestPhone = isIncoming ? from : to;
    const senderType = isIncoming ? "GUEST" as const : "HOST" as const;

    if (!guestPhone || !content) {
      console.warn("[Webhook:OpenPhone] Missing phone or content, skipping");
      return c.json({ success: true });
    }

    // Normalize phone for matching
    const normalizedPhone = normalizePhone(guestPhone);

    // Find or create guest by phone
    let guest = await prisma.guest.findFirst({
      where: {
        phone: { in: [guestPhone, normalizedPhone, guestPhone.replace(/^\+1/, "")] },
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: { phone: normalizedPhone },
      });
      console.log(`[Webhook:OpenPhone] Created new guest for phone ${normalizedPhone}`);
    }

    // Find active reservation for this guest (if any)
    const now = new Date();
    const reservation = await prisma.reservation.findFirst({
      where: {
        guestId: guest.id,
        checkIn: { lte: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) }, // within 2 days of check-in
        checkOut: { gte: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }, // not checked out more than 1 day ago
      },
      orderBy: { checkIn: "desc" },
    });

    // Find or create thread for this guest + property combo
    const propertyId = reservation
      ? reservation.propertyId
      : (await prisma.property.findFirst({ select: { id: true } }))?.id;

    if (!propertyId) {
      console.warn("[Webhook:OpenPhone] No property found, skipping thread creation");
      return c.json({ success: true });
    }

    // Look for existing thread by guest
    let thread = await prisma.messageThread.findFirst({
      where: {
        guestId: guest.id,
        propertyId,
        status: { not: "RESOLVED" },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          propertyId,
          guestId: guest.id,
          reservationId: reservation?.id ?? null,
          status: "ACTIVE",
          lastMessageAt: createdAt,
        },
      });
      console.log(`[Webhook:OpenPhone] Created new thread ${thread.id} for guest ${guest.id}`);
    }

    // Check for duplicate message
    const existingMsg = openphoneMessageId
      ? await prisma.message.findFirst({
          where: {
            threadId: thread.id,
            content,
            createdAt: {
              gte: new Date(createdAt.getTime() - 60000),
              lte: new Date(createdAt.getTime() + 60000),
            },
            senderType,
          },
        })
      : null;

    if (existingMsg) {
      console.log(`[Webhook:OpenPhone] Duplicate message, skipping`);
      return c.json({ success: true, duplicate: true });
    }

    // Store message
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderType,
        content,
        createdAt,
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: createdAt },
    });

    console.log(
      `[Webhook:OpenPhone] Stored ${senderType} message ${message.id} in thread ${thread.id}`
    );

    // Trigger AI suggestion for guest messages
    if (senderType === "GUEST") {
      // Fire and forget — don't block webhook response
      processNewGuestMessage(thread.id, message.id).catch((err) => {
        console.error("[Webhook:OpenPhone] AI suggestion failed:", (err as Error).message);
      });
    }

    return c.json({ success: true, messageId: message.id });
  }

  // Log other events
  console.log(`[Webhook:OpenPhone] Unhandled event type: ${eventType}`);
  return c.json({ success: true });
});

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export default openphoneWebhooks;
