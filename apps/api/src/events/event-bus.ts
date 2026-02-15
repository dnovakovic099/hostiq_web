import { prisma } from "@hostiq/db";
import { type DomainEvent, type EventType, EVENT_TYPES } from "@hostiq/shared";
import { nanoid } from "nanoid";

// ============================================
// Domain Event Bus
// Central dispatcher for all system events.
// Every event creates an automation_run log.
// ============================================

type EventHandler = (event: DomainEvent) => Promise<void>;

const handlers: Map<string, EventHandler[]> = new Map();

/**
 * Register a handler for an event type
 */
export function on(eventType: EventType | string, handler: EventHandler): void {
  const existing = handlers.get(eventType) || [];
  existing.push(handler);
  handlers.set(eventType, existing);
}

/**
 * Emit a domain event
 * - Logs the automation run
 * - Dispatches to all registered handlers
 * - Catches handler errors and logs them
 */
export async function emit<T = unknown>(
  type: EventType | string,
  payload: T,
  options: {
    source?: string;
    idempotencyKey?: string;
  } = {}
): Promise<string> {
  const event: DomainEvent<T> = {
    id: nanoid(),
    type: type as EventType,
    payload,
    timestamp: new Date().toISOString(),
    source: options.source || "system",
    idempotencyKey: options.idempotencyKey,
  };

  // Idempotency check
  if (options.idempotencyKey) {
    const existing = await prisma.automationRun.findFirst({
      where: {
        eventPayload: {
          path: ["idempotency_key"],
          equals: options.idempotencyKey,
        },
      },
    });
    if (existing) {
      console.log(`[EventBus] Duplicate event ${options.idempotencyKey}, skipping`);
      return existing.id;
    }
  }

  const startTime = Date.now();
  const eventHandlers = handlers.get(type) || [];
  const results: string[] = [];
  let hasError = false;

  for (const handler of eventHandlers) {
    try {
      await handler(event);
      results.push("ok");
    } catch (err) {
      hasError = true;
      results.push(`error: ${(err as Error).message}`);
      console.error(`[EventBus] Handler error for ${type}:`, err);
    }
  }

  const durationMs = Date.now() - startTime;

  // Log automation run
  const run = await prisma.automationRun.create({
    data: {
      eventType: type,
      eventPayload: {
        ...((payload && typeof payload === "object" ? payload : { value: payload }) as Record<string, unknown>),
        event_id: event.id,
        idempotency_key: options.idempotencyKey || null,
      },
      rulesEvaluated: { handlers: eventHandlers.length, results },
      outcome: hasError ? "partial_failure" : eventHandlers.length > 0 ? "handled" : "no_handlers",
      confidence: hasError ? 0.5 : 1.0,
      humanOverride: false,
      durationMs,
    },
  });

  if (eventHandlers.length > 0) {
    console.log(
      `[EventBus] ${type} dispatched to ${eventHandlers.length} handlers in ${durationMs}ms (run: ${run.id})`
    );
  }

  return run.id;
}

/**
 * Emit event to dead letter queue (failed processing)
 */
export async function emitToDLQ(
  type: string,
  payload: unknown,
  error: string,
  source: string
): Promise<void> {
  await prisma.automationRun.create({
    data: {
      eventType: `dlq.${type}`,
      eventPayload: {
        original_type: type,
        payload: payload as Record<string, unknown>,
        error,
        source,
        dlq_at: new Date().toISOString(),
      },
      outcome: "dead_lettered",
      confidence: 0,
      error,
    },
  });

  console.warn(`[EventBus:DLQ] Event ${type} dead-lettered: ${error}`);
}

// Re-export event types for convenience
export { EVENT_TYPES };
