// ============================================
// Domain Event Types
// ============================================

export const EVENT_TYPES = {
  // Messages
  MESSAGE_RECEIVED: "message.received",

  // Reservations
  RESERVATION_CREATED: "reservation.created",
  RESERVATION_MODIFIED: "reservation.modified",
  RESERVATION_CANCELLED: "reservation.cancelled",
  RESERVATION_MOVED: "reservation.moved",

  // Cleaning
  CHECKOUT_UPCOMING: "checkout.upcoming",
  CLEANING_NOT_ACKNOWLEDGED: "cleaning.not_acknowledged",
  CLEANING_COMPLETED: "cleaning.completed",

  // Pricing
  PRICING_UPDATE_DUE: "pricing.update_due",

  // Reviews
  REVIEW_RECEIVED: "review.received",

  // AI/Sentiment
  SENTIMENT_NEGATIVE_DETECTED: "sentiment.negative_detected",

  // Issues
  ISSUE_RECURRING_DETECTED: "issue.recurring_detected",

  // Guest screening
  GUEST_RISK_FLAGGED: "guest.risk_flagged",

  // HostBuddy
  HOSTBUDDY_ACTION_ITEM: "hostbuddy.action_item_received",

  // Listings
  LISTING_CREATED: "listing.created",
  LISTING_UPDATED: "listing.updated",

  // Escalations (emitted when escalation is created)
  ESCALATION_CREATED: "escalation.created",

  // Sync
  SYNC_PROGRESS: "sync.progress",

  // Integration health
  HEALTH_CHANGED: "health.changed",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export interface DomainEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  timestamp: string;
  source: string;
  idempotencyKey?: string;
}
