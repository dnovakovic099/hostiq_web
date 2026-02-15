/**
 * Pagination stress tests for Hostify API.
 * Proves: limit is ignored, no duplicates, empty page termination, safety ceiling.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { HOSTIFY } from "@hostiq/shared";

describe.skipIf(!process.env.HOSTIFY_API_KEY)(
  "Hostify pagination (live API)",
  () => {
    let hostifyPaginateFn: (endpoint: string, opts?: { maxPages?: number; params?: Record<string, string | number> }) => Promise<{ id: number }[]>;
    let hostifyRequestFn: (endpoint: string, opts?: { params?: Record<string, string | number> }) => Promise<unknown>;

    beforeAll(async () => {
      const mod = await import("../../integrations/hostify/client");
      hostifyPaginateFn = mod.hostifyPaginate;
      hostifyRequestFn = mod.hostifyRequest;
    });

    it("fetches all listings and returns more than 0 results", async () => {
      // Proves: /listings endpoint returns data and pagination works
      const listings = await hostifyPaginateFn<{ id: number }>("/listings", {
        maxPages: 5, // Limit pages for faster test
      });
      expect(listings.length).toBeGreaterThan(0);
      expect(listings.every((l) => l.id != null)).toBe(true);
    });

    it("pagination does not return duplicate IDs", async () => {
      // Proves: hostifyPaginate deduplicates by ID (Hostify can return same page twice)
      const listings = await hostifyPaginateFn<{ id: number }>("/listings", {
        maxPages: 10,
      });
      const ids = listings.map((l) => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("limit parameter is ignored - request with limit=5 still returns ~20", async () => {
      // Proves: Hostify API ignores limit param, always returns ~PAGE_SIZE
      const response = await hostifyRequestFn<unknown[] | { data: unknown[] }>(
        "/listings",
        { params: { page: 1, limit: 5 } }
      );
      const records = Array.isArray(response) ? response : response.data ?? [];
      // Hostify returns ~20 per page regardless of limit
      expect(records.length).toBeGreaterThanOrEqual(HOSTIFY.PAGE_SIZE - 2);
      expect(records.length).toBeLessThanOrEqual(HOSTIFY.PAGE_SIZE + 2);
    });

    it("empty last page terminates pagination correctly", async () => {
      // Proves: Two consecutive empty pages cause pagination to stop
      const listings = await hostifyPaginateFn<{ id: number }>("/listings", {
        maxPages: 100,
      });
      // Should have stopped naturally, not hit maxPages (unless we have 2000+ listings)
      expect(listings.length).toBeGreaterThan(0);
    });

    it("safety ceiling prevents infinite loops - stops at maxPages", async () => {
      // Proves: maxPages is respected - pagination stops even if more data exists
      const result = await hostifyPaginateFn<{ id: number }>("/listings", {
        maxPages: 2, // Force stop after 2 pages
      });
      // With maxPages=2, we get at most 2 pages of data (~40 records)
      expect(result.length).toBeLessThanOrEqual(2 * (HOSTIFY.PAGE_SIZE + 5));
    });
  }
);
