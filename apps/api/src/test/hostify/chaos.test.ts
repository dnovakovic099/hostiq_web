/**
 * Chaos/failure injection tests for Hostify client.
 * Tests timeout, 500 retry, 429 rate limit, partial JSON, connection reset.
 * Uses mocked fetch - no live API needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env before client loads
vi.mock("../../env", () => ({
  env: {
    HOSTIFY_API_KEY: "test-api-key",
    HOSTIFY_BASE_URL: "https://api-rms.hostify.com",
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Hostify client chaos handling", () => {
  let hostifyRequest: (endpoint: string, opts?: { retries?: number }) => Promise<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../../integrations/hostify/client");
    hostifyRequest = mod.hostifyRequest;
  });

  it("handles timeout gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("AbortError"));

    await expect(hostifyRequest("/listings", { retries: 1 })).rejects.toThrow();
  });

  it("handles 500 error with retry", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 1 }]),
      });

    const result = await hostifyRequest("/listings", { retries: 3 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("handles 429 rate limit with retry", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 1 }]),
      });

    const result = await hostifyRequest("/listings", { retries: 3 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("handles partial JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new SyntaxError("Unexpected end of JSON input")),
    });

    await expect(hostifyRequest("/listings", { retries: 1 })).rejects.toThrow();
  });

  it("handles connection reset", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNRESET"));

    await expect(hostifyRequest("/listings", { retries: 1 })).rejects.toThrow(
      "ECONNRESET"
    );
  });
});
