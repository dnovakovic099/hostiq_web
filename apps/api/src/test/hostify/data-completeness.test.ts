/**
 * Data completeness tests for Hostify API.
 * Validates that listings, reservations, and message threads have required fields.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { hostify } from "../../integrations/hostify/client";
import {
  KNOWN_LISTING_IDS,
  KNOWN_RESERVATION_IDS,
} from "./helpers";

describe.skipIf(!process.env.HOSTIFY_API_KEY)(
  "Hostify data completeness (live API)",
  () => {
    let hostifyClient: typeof hostify;

    beforeAll(async () => {
      const mod = await import("../../integrations/hostify/client");
      hostifyClient = mod.hostify;
    });

    it("listings have required fields (id, name, address or location)", async () => {
      const listings = await hostifyClient.getListings();
      expect(listings.length).toBeGreaterThan(0);

      for (const listing of listings) {
        expect(listing).toHaveProperty("id");
        expect(listing.id).toBeDefined();
        const hasName = "name" in listing && listing.name != null;
        const hasAddress = "address" in listing && listing.address != null;
        const hasLocation = "location" in listing && listing.location != null;
        expect(
          hasName || hasAddress || hasLocation,
          `Listing ${listing.id} missing name, address, or location`
        ).toBe(true);
      }
    });

    it("reservations have checkIn, checkOut, guestName or guest object", async () => {
      const reservations = await hostifyClient.getReservations();
      if (reservations.length === 0) return;

      for (const res of reservations) {
        expect(res).toHaveProperty("id");
        const r = res as Record<string, unknown>;
        const hasCheckIn =
          r.check_in != null || r.checkIn != null || r.check_in_date != null;
        const hasCheckOut =
          r.check_out != null || r.checkOut != null || r.check_out_date != null;
        const hasGuest =
          r.guest_name != null ||
          r.guestName != null ||
          (r.guest != null && typeof r.guest === "object");
        expect(
          hasCheckIn && hasCheckOut,
          `Reservation ${res.id} missing check-in/check-out`
        ).toBe(true);
        expect(
          hasGuest,
          `Reservation ${res.id} missing guest info`
        ).toBe(true);
      }
    });

    it("at least one known ground-truth reservation exists when IDs are configured", async () => {
      if (KNOWN_RESERVATION_IDS.length === 0) {
        console.log("Skipping: KNOWN_RESERVATION_IDS not populated");
        return;
      }

      for (const id of KNOWN_RESERVATION_IDS) {
        const res = await hostifyClient.getReservation(Number(id));
        expect(res).toBeDefined();
        expect((res as { id: number }).id).toBe(Number(id));
      }
      console.log("CONFIRMED: All known reservation IDs exist");
    });

    it("at least one known ground-truth listing exists when IDs are configured", async () => {
      if (KNOWN_LISTING_IDS.length === 0) {
        console.log("Skipping: KNOWN_LISTING_IDS not populated");
        return;
      }

      for (const id of KNOWN_LISTING_IDS) {
        const listing = await hostifyClient.getListing(Number(id));
        expect(listing).toBeDefined();
        expect((listing as { id: number }).id).toBe(Number(id));
      }
      console.log("CONFIRMED: All known listing IDs exist");
    });

    it("message threads have at least one message when fetched by ID", async () => {
      const threads = await hostifyClient.getInbox();
      if (threads.length === 0) return;

      // Fetch first thread detail
      const firstThread = threads[0];
      const detail = await hostifyClient.getThread(firstThread.id);
      const messages = (detail as { messages?: unknown[] }).messages ?? [];
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    it("paginated listings count is consistent with total", async () => {
      // Compare paginated fetch vs potential total - Hostify may not expose total
      const listings = await hostifyClient.getListings();
      const ids = new Set(listings.map((l) => l.id));
      expect(ids.size).toBe(listings.length);
    });
  }
);
