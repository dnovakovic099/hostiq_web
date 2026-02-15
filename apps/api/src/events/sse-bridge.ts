import { on, EVENT_TYPES } from "./event-bus";
import { sseManager, SSE_EVENT_TYPES } from "../routes/sse";
import type { DomainEvent } from "@hostiq/shared";

// ============================================
// SSE Bridge
// Listens to domain events and pushes to connected SSE clients.
// Formats payloads for frontend (minimal data over the wire).
// ============================================

function getPropertyId(payload: Record<string, unknown>): string | null {
  const id =
    (payload.property_id as string) ||
    (payload.propertyId as string) ||
    null;
  return id ?? null;
}

function formatReservation(payload: Record<string, unknown>) {
  return {
    id: payload.reservation_id ?? payload.id,
    propertyId: payload.property_id ?? payload.propertyId,
    status: payload.status,
    checkIn: payload.check_in ?? payload.checkIn,
    checkOut: payload.check_out ?? payload.checkOut,
  };
}

function formatMessage(payload: Record<string, unknown>) {
  return {
    id: payload.message_id ?? payload.id,
    threadId: payload.thread_id ?? payload.threadId,
    content: payload.content,
    senderType: payload.sender_type ?? payload.senderType,
  };
}

function formatIssue(payload: Record<string, unknown>) {
  return {
    id: payload.issue_id ?? payload.id,
    propertyId: payload.property_id ?? payload.propertyId,
    category: payload.category,
    severity: payload.severity,
  };
}

function formatEscalation(payload: Record<string, unknown>) {
  return {
    id: payload.escalation_id ?? payload.id,
    propertyId: payload.property_id ?? payload.propertyId,
    type: payload.type,
    severity: payload.severity,
    summary: payload.summary,
  };
}

function formatCleaning(payload: Record<string, unknown>) {
  return {
    id: payload.task_id ?? payload.id,
    propertyId: payload.property_id ?? payload.propertyId,
    reservationId: payload.reservation_id ?? payload.reservationId,
    status: payload.status,
  };
}

function formatSyncProgress(payload: Record<string, unknown>) {
  return {
    jobId: payload.job_id ?? payload.jobId,
    progress: payload.progress,
    total: payload.total,
    current: payload.current,
    message: payload.message,
  };
}

function formatHealthChanged(payload: Record<string, unknown>) {
  return {
    integration: payload.integration,
    status: payload.status,
    propertyId: payload.property_id ?? payload.propertyId,
  };
}

export function registerSSEBridge(): void {
  // reservation.new
  on(EVENT_TYPES.RESERVATION_CREATED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.RESERVATION_NEW,
      formatReservation(p),
      getPropertyId(p)
    );
  });

  // reservation.updated
  on(EVENT_TYPES.RESERVATION_MODIFIED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.RESERVATION_UPDATED,
      { ...formatReservation(p), change: "modified" },
      getPropertyId(p)
    );
  });
  on(EVENT_TYPES.RESERVATION_CANCELLED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.RESERVATION_UPDATED,
      { ...formatReservation(p), change: "cancelled" },
      getPropertyId(p)
    );
  });
  on(EVENT_TYPES.RESERVATION_MOVED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.RESERVATION_UPDATED,
      { ...formatReservation(p), change: "moved" },
      getPropertyId(p)
    );
  });

  // message.new
  on(EVENT_TYPES.MESSAGE_RECEIVED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.MESSAGE_NEW,
      formatMessage(p),
      getPropertyId(p)
    );
  });

  // issue.new
  on(EVENT_TYPES.HOSTBUDDY_ACTION_ITEM, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.ISSUE_NEW,
      formatIssue(p),
      getPropertyId(p)
    );
  });

  // escalation.new
  on(EVENT_TYPES.ESCALATION_CREATED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.ESCALATION_NEW,
      formatEscalation(p),
      getPropertyId(p)
    );
  });

  // cleaning.updated
  on(EVENT_TYPES.CLEANING_COMPLETED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.CLEANING_UPDATED,
      { ...formatCleaning(p), change: "completed" },
      getPropertyId(p)
    );
  });
  on(EVENT_TYPES.CLEANING_NOT_ACKNOWLEDGED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.CLEANING_UPDATED,
      { ...formatCleaning(p), change: "escalated" },
      getPropertyId(p)
    );
  });

  // sync.progress
  on(EVENT_TYPES.SYNC_PROGRESS, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.SYNC_PROGRESS,
      formatSyncProgress(p),
      getPropertyId(p)
    );
  });

  // health.changed
  on(EVENT_TYPES.HEALTH_CHANGED, async (event: DomainEvent) => {
    const p = (event.payload || {}) as Record<string, unknown>;
    sseManager.broadcast(
      SSE_EVENT_TYPES.HEALTH_CHANGED,
      formatHealthChanged(p),
      getPropertyId(p)
    );
  });

  console.log("[SSE] Bridge registered.");
}
