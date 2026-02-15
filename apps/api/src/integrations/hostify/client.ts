import { HOSTIFY } from "@hostiq/shared";
import { env } from "../../env";

// ============================================
// Hostify API Client
//
// CRITICAL RULES (from live testing):
// - Auth header: try x-api-key first, X-API-Key fallback
// - limit param is IGNORED (always returns ~20)
// - Date filters are BROKEN (check_in, check_out, etc.)
// - Status filter is UNRELIABLE
// - reservation_id on /inbox is UNRELIABLE
// - ONLY listing_id filter is reliable
// - All filtering must happen client-side on cached data
// ============================================

type HeaderMode = "lowercase" | "uppercase";

let cachedHeaderMode: HeaderMode | null = null;
let activeRequests = 0;
const MAX_CONCURRENT = HOSTIFY.MAX_CONCURRENT_REQUESTS;
const requestQueue: Array<() => void> = [];

function getHeaders(mode: HeaderMode): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (mode === "lowercase") {
    headers["x-api-key"] = env.HOSTIFY_API_KEY;
  } else {
    headers["X-API-Key"] = env.HOSTIFY_API_KEY;
  }

  return headers;
}

async function waitForSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise((resolve) => {
    requestQueue.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests--;
  const next = requestQueue.shift();
  if (next) next();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface HostifyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, string | number>;
  body?: unknown;
  retries?: number;
}

export async function hostifyRequest<T = unknown>(
  endpoint: string,
  options: HostifyRequestOptions = {}
): Promise<T> {
  const { method = "GET", params, body, retries = HOSTIFY.RETRY_ATTEMPTS } = options;

  // Build URL with query params
  const url = new URL(`${env.HOSTIFY_BASE_URL}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  // Rate limiting
  await waitForSlot();

  try {
    // Determine header mode (try cached first)
    const modesToTry: HeaderMode[] = cachedHeaderMode
      ? [cachedHeaderMode]
      : ["lowercase", "uppercase"];

    let lastError: Error | null = null;

    for (const mode of modesToTry) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url.toString(), {
            method,
            headers: getHeaders(mode),
            body: body ? JSON.stringify(body) : undefined,
          });

          // Rate limited
          if (response.status === 429) {
            const delay = HOSTIFY.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(
              `[Hostify] Rate limited on ${endpoint}, waiting ${delay}ms (attempt ${attempt}/${retries})`
            );
            await sleep(delay);
            continue;
          }

          // Auth failed - try other header mode
          if (response.status === 401 || response.status === 403) {
            console.warn(
              `[Hostify] Auth failed with ${mode} header mode on ${endpoint}`
            );
            lastError = new Error(
              `Auth failed with ${mode} header: ${response.status}`
            );
            break; // Break retry loop, try next mode
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Hostify ${method} ${endpoint} failed: ${response.status} - ${errorText}`
            );
          }

          // Success - cache the working header mode
          if (!cachedHeaderMode) {
            cachedHeaderMode = mode;
            console.log(
              `[Hostify] Auth header mode locked to: ${mode} (${mode === "lowercase" ? "x-api-key" : "X-API-Key"})`
            );
          }

          return (await response.json()) as T;
        } catch (err) {
          lastError = err as Error;
          if (attempt < retries) {
            const delay = HOSTIFY.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(
              `[Hostify] Request failed on ${endpoint}, retrying in ${delay}ms (attempt ${attempt}/${retries}): ${(err as Error).message}`
            );
            await sleep(delay);
          }
        }
      }
    }

    throw lastError || new Error(`Hostify request failed: ${endpoint}`);
  } finally {
    releaseSlot();
  }
}

// ============================================
// Paginated fetch - handles Hostify's broken pagination
// limit param is ignored, always returns ~20 per page
// Terminates on: empty page, repeated records, or safety ceiling
// ============================================

export interface PaginateOptions {
  params?: Record<string, string | number>;
  maxPages?: number;
  onPage?: (page: number, total: number) => void;
}

export async function hostifyPaginate<T extends { id: number | string }>(
  endpoint: string,
  options: PaginateOptions = {}
): Promise<T[]> {
  const { params = {}, maxPages = 1000, onPage } = options;
  const allRecords: T[] = [];
  const seenIds = new Set<string | number>();
  let page = 1;
  let consecutiveEmptyOrDuplicate = 0;

  while (page <= maxPages) {
    const response = await hostifyRequest<Record<string, unknown>>(endpoint, {
      params: { ...params, page },
    });

    // Hostify wraps paginated data in varying keys:
    // /listings -> { listings: [...] }
    // /reservations -> { reservations: [...] } or { data: [...] }
    // /inbox -> { data: [...] } or { threads: [...] }
    // /reviews -> { reviews: [...] } or { data: [...] }
    // Also might return a plain array
    let records: T[];
    if (Array.isArray(response)) {
      records = response as unknown as T[];
    } else {
      // Try known keys in priority order
      const entityKey = endpoint.replace(/^\//, "").split("?")[0]; // "listings", "reservations", etc.
      const data =
        (response[entityKey] as T[]) ||
        (response.data as T[]) ||
        (response.results as T[]) ||
        (response.items as T[]) ||
        (response.threads as T[]) ||
        [];
      records = Array.isArray(data) ? data : [];
    }

    if (records.length === 0) {
      consecutiveEmptyOrDuplicate++;
      if (consecutiveEmptyOrDuplicate >= 2) {
        // Two empty pages in a row = definitely done
        break;
      }
      page++;
      continue;
    }

    // Check for repeated records (Hostify might return same page)
    let newRecords = 0;
    for (const record of records) {
      if (!seenIds.has(record.id)) {
        seenIds.add(record.id);
        allRecords.push(record);
        newRecords++;
      }
    }

    if (newRecords === 0) {
      // All records on this page were duplicates - we've looped
      console.warn(
        `[Hostify] All records on page ${page} of ${endpoint} were duplicates. Terminating pagination.`
      );
      break;
    }

    consecutiveEmptyOrDuplicate = 0;

    if (onPage) {
      onPage(page, allRecords.length);
    }

    console.log(
      `[Hostify] ${endpoint} page ${page}: ${newRecords} new records (total: ${allRecords.length})`
    );

    page++;
  }

  if (page > maxPages) {
    console.warn(
      `[Hostify] Pagination safety ceiling reached (${maxPages} pages) for ${endpoint}`
    );
  }

  return allRecords;
}

// ============================================
// Convenience methods for each endpoint
// ============================================

export const hostify = {
  // Listings
  getListings: () =>
    hostifyPaginate<HostifyListingRaw>("/listings"),

  getListing: (id: number) =>
    hostifyRequest<HostifyListingRaw>(`/listings/${id}`),

  // Reservations
  getReservations: (listingId?: number) =>
    hostifyPaginate<HostifyReservationRaw>("/reservations", {
      params: listingId ? { listing_id: listingId } : {},
    }),

  getReservation: (id: number) =>
    hostifyRequest<HostifyReservationRaw>(`/reservations/${id}`),

  getReservationFinancials: (id: number) =>
    hostifyRequest(`/reservations/${id}/financials`),

  // Inbox / Messages
  getInbox: (listingId?: number) =>
    hostifyPaginate<HostifyThreadRaw>("/inbox", {
      params: listingId ? { listing_id: listingId } : {},
    }),

  getThread: (threadId: number) =>
    hostifyRequest<HostifyThreadDetailRaw>(`/inbox/${threadId}`),

  sendMessage: (threadId: number, message: string) =>
    hostifyRequest(`/inbox/${threadId}/messages`, {
      method: "POST",
      body: { message },
    }),

  // Reviews
  getReviews: (listingId?: number) =>
    hostifyPaginate<HostifyReviewRaw>("/reviews", {
      params: listingId ? { listing_id: listingId } : {},
    }),

  // Calendar
  getCalendar: (listingId: number) =>
    hostifyRequest(`/calendar/${listingId}`),

  updateCalendar: (listingId: number, data: unknown) =>
    hostifyRequest(`/calendar/${listingId}`, {
      method: "PUT",
      body: data,
    }),

  getCalendarPrices: (listingId: number) =>
    hostifyRequest(`/calendar/${listingId}/prices`),

  updateCalendarPrices: (listingId: number, data: unknown) =>
    hostifyRequest(`/calendar/${listingId}/prices`, {
      method: "PUT",
      body: data,
    }),

  // Payouts
  getPayouts: () => hostifyRequest("/payouts"),

  // Users / Owners
  getUsers: () => hostifyRequest("/users"),
  getOwners: () => hostifyRequest("/owners"),

  // Webhooks
  listWebhooks: () => hostifyRequest("/webhooks_v2"),

  createWebhook: (notificationType: string, url: string, auth?: string) =>
    hostifyRequest("/webhooks_v2", {
      method: "POST",
      body: { notification_type: notificationType, url, ...(auth ? { auth } : {}) },
    }),

  deleteWebhook: (id: number) =>
    hostifyRequest(`/webhooks_v2/${id}`, { method: "DELETE" }),

  // Custom Fields
  getCustomFields: () => hostifyRequest("/custom_fields"),

  createCustomField: (data: {
    ref: "listing" | "reservation";
    name: string;
    type: string;
    option_values?: Record<string, string>;
  }) =>
    hostifyRequest("/custom_fields", { method: "POST", body: data }),

  setCustomFieldValues: (
    customFieldId: number,
    value: string,
    listingIds: number[]
  ) =>
    hostifyRequest("/custom_fields/set_values", {
      method: "POST",
      body: { custom_field_id: customFieldId, value, listing_ids: listingIds },
    }),
};

// Raw types from Hostify (loosely typed - actual schema varies)
interface HostifyListingRaw {
  id: number;
  [key: string]: unknown;
}

interface HostifyReservationRaw {
  id: number;
  [key: string]: unknown;
}

interface HostifyThreadRaw {
  id: number;
  [key: string]: unknown;
}

interface HostifyThreadDetailRaw {
  id: number;
  messages?: Array<{ id: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface HostifyReviewRaw {
  id: number;
  [key: string]: unknown;
}
