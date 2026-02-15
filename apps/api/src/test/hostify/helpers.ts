/**
 * Test helpers for Hostify API integration tests.
 * Use getTestClient() to obtain API credentials for live API tests.
 */

export const HOSTIFY_BASE_URL =
  process.env.HOSTIFY_BASE_URL ?? "https://api-rms.hostify.com";

/**
 * Known listing IDs - populate after first successful sync for ground-truth tests.
 * Add IDs from your Hostify account to validate data completeness.
 */
export const KNOWN_LISTING_IDS: string[] = [];

/**
 * Known reservation IDs - populate after first successful sync for ground-truth tests.
 * Add IDs from your Hostify account to validate data completeness.
 */
export const KNOWN_RESERVATION_IDS: string[] = [];

/**
 * Returns API config for tests. Use with raw fetch for auth tests,
 * or import hostify from the client for other tests.
 * Throws if HOSTIFY_API_KEY is not set.
 */
export function getTestClient() {
  const apiKey = process.env.HOSTIFY_API_KEY;
  if (!apiKey) {
    throw new Error("HOSTIFY_API_KEY must be set for live API tests");
  }
  return {
    apiKey,
    baseUrl: HOSTIFY_BASE_URL,
  };
}
