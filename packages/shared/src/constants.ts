// ============================================
// Application Constants
// ============================================

export const ROLES = {
  OWNER: "OWNER",
  CLEANER: "CLEANER",
  INTERNAL_OPS: "INTERNAL_OPS",
  ADMIN: "ADMIN",
} as const;

export const HOSTIFY = {
  BASE_URL: "https://api-rms.hostify.com",
  PAGE_SIZE: 20, // Fixed by Hostify, limit param ignored
  MAX_CONCURRENT_REQUESTS: 2,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  RECONCILIATION_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours
  KNOWN_LISTING_COUNT: 361,
  KNOWN_RESERVATION_COUNT: 14499,
  // Reliable filters
  RELIABLE_FILTERS: ["listing_id"] as const,
  // Broken filters - NEVER use these in production
  BROKEN_FILTERS: [
    "filters[checkOut]",
    "check_out_gte",
    "check_in_lte",
    "status",
    "reservation_id", // on /inbox endpoint
    "limit", // always ignored, returns 20
  ] as const,
  // Active reservation statuses
  ACTIVE_STATUSES: [
    "accepted",
    "moved",
    "extended",
    "pre-approved",
    "inquiry",
  ] as const,
  // SNS webhook notification types
  WEBHOOK_TYPES: [
    "message_new",
    "new_reservation",
    "update_reservation",
    "move_reservation",
    "create_listing",
    "update_listing",
    "create_update_listing",
    "listing_photo_processed",
  ] as const,
} as const;

export const HOSTBUDDY = {
  CATEGORIES: [
    "Cleanliness",
    "Guest Requests",
    "Maintenance",
    "Reservation Changes",
    "Other",
  ] as const,
} as const;

export const ESCALATION = {
  KEYWORDS: [
    "refund",
    "cancel",
    "angry",
    "police",
    "emergency",
    "dirty",
    "broken",
    "disgusting",
    "unacceptable",
    "lawyer",
    "health department",
  ] as const,
  SMS_FALLBACK_MINUTES: 15,
  DEFAULT_SLA_HOURS: 4,
} as const;

export const CLEANING = {
  REMINDER_DAY_BEFORE_HOUR: 18, // 6pm
  REMINDER_DAY_OF_HOUR: 8, // 8am
  ESCALATION_CUTOFF_HOUR: 10, // 10am
  DEFAULT_BUFFER_MINUTES: 30,
} as const;

export const PRICING = {
  DEFAULT_MAX_DAILY_CHANGE_PCT: 20,
  APPROVAL_MODES: ["auto", "owner_approve_large", "manual"] as const,
} as const;
