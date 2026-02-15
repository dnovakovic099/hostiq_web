/**
 * Auth header tests for Hostify API.
 * Proves: lowercase x-api-key works, uppercase X-API-Key works, no/wrong key returns 401/403.
 */

import { describe, it, expect } from "vitest";
import { HOSTIFY_BASE_URL, getTestClient } from "./helpers";

describe.skipIf(!process.env.HOSTIFY_API_KEY)(
  "Hostify auth headers (live API)",
  () => {
    it("lowercase x-api-key works", async () => {
      const { apiKey, baseUrl } = getTestClient();
      const url = `${baseUrl}/listings?page=1`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });
      expect([200, 201]).toContain(res.status);
    });

    it("uppercase X-API-Key works", async () => {
      const { apiKey, baseUrl } = getTestClient();
      const url = `${baseUrl}/listings?page=1`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
      });
      expect([200, 201]).toContain(res.status);
    });

    it("no header returns 401 or 403", async () => {
      const { baseUrl } = getTestClient();
      const url = `${baseUrl}/listings?page=1`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      expect([401, 403]).toContain(res.status);
    });

    it("wrong key returns 401 or 403", async () => {
      const { baseUrl } = getTestClient();
      const url = `${baseUrl}/listings?page=1`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "invalid-key-that-should-fail",
        },
      });
      expect([401, 403]).toContain(res.status);
    });
  }
);
