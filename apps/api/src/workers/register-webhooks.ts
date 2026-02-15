import { prisma } from "@hostiq/db";
import { hostify } from "../integrations/hostify/client";
import { env } from "../env";

const REQUIRED_TYPES = [
  "message_new",
  "new_reservation",
  "update_reservation",
  "move_reservation",
] as const;

const WEBHOOK_URL = `${env.API_URL}/api/webhooks/hostify`;

export async function registerHostifyWebhooks(): Promise<void> {
  console.log("[Webhooks] Registering Hostify webhooks...");

  try {
    const existing = await hostify.listWebhooks();
    const webhooks = Array.isArray(existing) ? existing : (existing as { data?: unknown[] })?.data ?? [];

    const existingTypes = new Set<string>();
    for (const wh of webhooks) {
      const type = (wh as { notification_type?: string }).notification_type;
      const url = (wh as { url?: string }).url;
      if (type && url?.includes(env.API_URL)) {
        existingTypes.add(type);
      }
    }

    for (const notificationType of REQUIRED_TYPES) {
      if (existingTypes.has(notificationType)) {
        console.log(`[Webhooks] ${notificationType} already registered`);
        continue;
      }

      const auth = env.HOSTIFY_WEBHOOK_AUTH_SECRET;
      const result = await hostify.createWebhook(
        notificationType,
        WEBHOOK_URL,
        auth
      );

      const hostifyWebhookId = (result as { id?: number }).id
        ? String((result as { id: number }).id)
        : null;

      await prisma.webhookRegistration.upsert({
        where: { notificationType },
        update: {
          hostifyWebhookId,
          endpointUrl: WEBHOOK_URL,
          authSecretRef: auth ? "env" : null,
        },
        create: {
          notificationType,
          endpointUrl: WEBHOOK_URL,
          hostifyWebhookId,
          authSecretRef: auth ? "env" : null,
        },
      });

      console.log(`[Webhooks] Registered ${notificationType} -> ${WEBHOOK_URL}`);
    }

    console.log("[Webhooks] Hostify webhook registration complete");
  } catch (err) {
    const error = err as Error;
    console.error("[Webhooks] Failed to register Hostify webhooks:", error.message);
    throw error;
  }
}
