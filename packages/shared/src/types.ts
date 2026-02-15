// ============================================
// Shared Types
// ============================================

export type UserRole = "OWNER" | "CLEANER" | "INTERNAL_OPS" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Hostify API types (based on observed responses)
export interface HostifyListing {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  [key: string]: unknown;
}

export interface HostifyReservation {
  id: number;
  listing_id: number;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  channel?: string;
  status?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  total?: number;
  nightly_rate?: number;
  cleaning_fee?: number;
  booked_at?: string;
  [key: string]: unknown;
}

export interface HostifyThread {
  id: number;
  listing_id?: number;
  reservation_id?: number;
  guest_name?: string;
  [key: string]: unknown;
}

export interface HostifyMessage {
  id: number;
  thread_id?: number;
  sender?: string;
  body?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface HostifyReview {
  id: number;
  listing_id?: number;
  reservation_id?: number;
  rating?: number;
  text?: string;
  response?: string;
  created_at?: string;
  [key: string]: unknown;
}

// HostBuddy webhook payload (schema TBD - discovered on first receive)
export interface HostbuddyActionItem {
  category?: string;
  description?: string;
  property_id?: string;
  reservation_id?: string;
  guest_name?: string;
  severity?: string;
  timestamp?: string;
  images?: string[];
  [key: string]: unknown;
}
