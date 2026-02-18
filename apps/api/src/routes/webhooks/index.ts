import { Hono } from "hono";
import { prisma } from "@hostiq/db";
import crypto from "crypto";

const webhooks = new Hono();

// ============================================
// POST /webhooks/hostify
// Handles Amazon SNS messages from Hostify
// ============================================
webhooks.post("/hostify", async (c) => {
  const body = await c.req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[Webhook:Hostify] Invalid JSON body");
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const snsType = payload.Type as string | undefined;

  // Handle SNS SubscriptionConfirmation
  if (snsType === "SubscriptionConfirmation") {
    const subscribeUrl = payload.SubscribeURL as string;
    if (!subscribeUrl) {
      console.error("[Webhook:Hostify] Missing SubscribeURL in confirmation");
      return c.json({ error: "Missing SubscribeURL" }, 400);
    }

    // Validate that SubscribeURL is from AWS SNS
    try {
      const url = new URL(subscribeUrl);
      if (!url.hostname.endsWith(".amazonaws.com")) {
        console.error("[Webhook:Hostify] Suspicious SubscribeURL:", subscribeUrl);
        return c.json({ error: "Invalid SubscribeURL" }, 400);
      }
    } catch {
      return c.json({ error: "Invalid SubscribeURL" }, 400);
    }

    // Confirm subscription
    console.log("[Webhook:Hostify] Confirming SNS subscription...");
    try {
      const response = await fetch(subscribeUrl);
      if (response.ok) {
        console.log("[Webhook:Hostify] SNS subscription confirmed!");

        // Update webhook registration status
        const topicArn = payload.TopicArn as string;
        if (topicArn) {
          await prisma.webhookRegistration.updateMany({
            where: { snsTopicArn: topicArn },
            data: { subscriptionConfirmed: true },
          });
        }
      } else {
        console.error("[Webhook:Hostify] Failed to confirm subscription:", response.status);
      }
    } catch (err) {
      console.error("[Webhook:Hostify] Error confirming subscription:", err);
    }

    return c.json({ success: true });
  }

  // Handle SNS Notification
  if (snsType === "Notification") {
    const messageId = payload.MessageId as string;

    // Idempotency check using SNS MessageId
    if (messageId) {
      const existing = await prisma.automationRun.findFirst({
        where: {
          eventPayload: {
            path: ["sns_message_id"],
            equals: messageId,
          },
        },
      });
      if (existing) {
        console.log(`[Webhook:Hostify] Duplicate SNS message ${messageId}, skipping`);
        return c.json({ success: true, duplicate: true });
      }
    }

    // Parse the inner message
    let innerMessage: Record<string, unknown>;
    try {
      const messageStr = payload.Message as string;
      innerMessage = typeof messageStr === "string" ? JSON.parse(messageStr) : messageStr as Record<string, unknown>;
    } catch {
      console.error("[Webhook:Hostify] Failed to parse inner message");
      innerMessage = { raw: payload.Message };
    }

    // Determine event type from SNS subject or message content
    const subject = (payload.Subject as string) || "unknown";
    console.log(`[Webhook:Hostify] Received notification: ${subject}`, JSON.stringify(innerMessage).slice(0, 200));

    // Log automation run
    await prisma.automationRun.create({
      data: {
        eventType: `hostify.${subject}`,
        eventPayload: {
          sns_message_id: messageId,
          subject,
          message: innerMessage,
          received_at: new Date().toISOString(),
        } as any,
        outcome: "received",
      },
    });

    // Update last received timestamp
    await prisma.webhookRegistration.updateMany({
      where: { snsTopicArn: payload.TopicArn as string },
      data: { lastReceivedAt: new Date() },
    });

    // TODO: Route to specific handlers based on notification type
    // - message_new -> ingest message, check HostBuddy
    // - new_reservation -> create reservation, cleaning task
    // - update_reservation -> update local record
    // - move_reservation -> update dates/listing

    return c.json({ success: true });
  }

  // Unknown SNS type
  console.warn("[Webhook:Hostify] Unknown SNS type:", snsType);
  return c.json({ success: true });
});

// ============================================
// POST /webhooks/hostbuddy
// Handles HTTP POST from HostBuddy action items
// ============================================
webhooks.post("/hostbuddy", async (c) => {
  const body = await c.req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[Webhook:HostBuddy] Invalid JSON body");
    return c.json({ error: "Invalid JSON" }, 400);
  }

  // Always log raw payload (schema is undocumented, capture everything)
  const payloadHash = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex")
    .slice(0, 16);

  // Idempotency: check if we've already processed this exact payload
  const existing = await prisma.hostbuddyWebhookLog.findFirst({
    where: {
      rawPayload: {
        path: ["_hash"],
        equals: payloadHash,
      },
    },
  });

  if (existing) {
    console.log(`[Webhook:HostBuddy] Duplicate payload ${payloadHash}, skipping`);
    return c.json({ success: true, duplicate: true });
  }

  // Store raw payload
  const log = await prisma.hostbuddyWebhookLog.create({
    data: {
      rawPayload: { ...payload, _hash: payloadHash },
      parsed: false,
      category: (payload.category as string) || (payload.action_item_category as string) || null,
    },
  });

  console.log(
    `[Webhook:HostBuddy] Received action item (log ${log.id}):`,
    JSON.stringify(payload).slice(0, 300)
  );

  // For now, store-only mode: capture raw payloads for schema discovery.
  // Parsing and issue creation will be implemented after reviewing real events.
  await prisma.integrationHealth.upsert({
    where: { integration: "hostbuddy" },
    update: {
      status: "connected",
      lastSuccessAt: new Date(),
      consecutiveFailures: 0,
    },
    create: {
      integration: "hostbuddy",
      status: "connected",
      lastSuccessAt: new Date(),
    },
  });

  await prisma.automationRun.create({
    data: {
      eventType: "hostbuddy.webhook_received",
      eventPayload: {
        webhook_log_id: log.id,
        payload_hash: payloadHash,
      } as any,
      outcome: "stored_raw",
      confidence: 1.0,
    },
  });

  console.log(
    `[Webhook:HostBuddy] Stored raw payload ${payloadHash} in log ${log.id} (parsing deferred)`
  );

  return c.json({ success: true });
});

// ============================================
// GET /webhooks/status
// Show webhook connection status
// ============================================
webhooks.get("/status", async (c) => {
  const registrations = await prisma.webhookRegistration.findMany();
  const hostbuddyHealth = await prisma.integrationHealth.findUnique({
    where: { integration: "hostbuddy" },
  });

  const lastHostbuddyLog = await prisma.hostbuddyWebhookLog.findFirst({
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true },
  });

  return c.json({
    success: true,
    data: {
      hostify: {
        webhooks: registrations.map((r) => ({
          type: r.notificationType,
          confirmed: r.subscriptionConfirmed,
          lastReceived: r.lastReceivedAt,
        })),
      },
      hostbuddy: {
        status: hostbuddyHealth?.status ?? "waiting",
        lastReceived: lastHostbuddyLog?.receivedAt ?? null,
        endpoint: "/api/webhooks/hostbuddy",
      },
    },
  });
});

export default webhooks;
