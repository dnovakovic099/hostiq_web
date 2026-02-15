/**
 * Unit tests for SNS webhook handling (no live API needed).
 * Tests SubscriptionConfirmation, Notification, idempotency, invalid JSON, UnsubscribeConfirmation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the app
const mockUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
const mockFindFirst = vi.fn().mockResolvedValue(null);
const mockCreate = vi.fn().mockResolvedValue({ id: 1 });

vi.mock("@hostiq/db", () => ({
  prisma: {
    webhookRegistration: { updateMany: mockUpdateMany },
    automationRun: {
      findFirst: mockFindFirst,
      create: mockCreate,
    },
  },
}));

// Mock fetch for SubscriptionConfirmation (confirm URL)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Hostify SNS webhook handler", () => {
  let app: {
    fetch: (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => Promise<Response>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    mockFindFirst.mockResolvedValue(null);
    const { default: webhookRoutes } = await import(
      "../../routes/webhooks/index"
    );
    const { Hono } = await import("hono");
    const api = new Hono();
    api.route("/webhooks", webhookRoutes);
    const appMain = new Hono();
    appMain.route("/api", api);
    app = appMain;
  });

  it("SubscriptionConfirmation handler confirms URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const body = JSON.stringify({
      Type: "SubscriptionConfirmation",
      SubscribeURL: "https://sns.us-east-1.amazonaws.com/confirm",
      TopicArn: "arn:aws:sns:us-east-1:123:hostify",
    });

    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://sns.us-east-1.amazonaws.com/confirm"
    );
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("SubscriptionConfirmation rejects non-AWS SubscribeURL", async () => {
    const body = JSON.stringify({
      Type: "SubscriptionConfirmation",
      SubscribeURL: "https://evil.com/confirm",
      TopicArn: "arn:aws:sns:us-east-1:123:hostify",
    });

    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("Notification handler processes message correctly", async () => {
    const body = JSON.stringify({
      Type: "Notification",
      MessageId: "msg-123",
      Subject: "new_reservation",
      Message: JSON.stringify({ reservation_id: 456 }),
      TopicArn: "arn:aws:sns:us-east-1:123:hostify",
    });

    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalled();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("duplicate MessageId is skipped (idempotency)", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 1 });

    const body = JSON.stringify({
      Type: "Notification",
      MessageId: "duplicate-msg-id",
      Subject: "update_reservation",
      Message: JSON.stringify({ reservation_id: 789 }),
      TopicArn: "arn:aws:sns:us-east-1:123:hostify",
    });

    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(200);
    expect(mockCreate).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it("invalid JSON returns 400", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body: "not valid json {",
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("UnsubscribeConfirmation is handled gracefully", async () => {
    const body = JSON.stringify({
      Type: "UnsubscribeConfirmation",
      MessageId: "unsub-1",
      SubscribeURL: "https://sns.us-east-1.amazonaws.com/unsubscribe",
      TopicArn: "arn:aws:sns:us-east-1:123:hostify",
    });

    const res = await app.fetch(
      new Request("http://localhost/api/webhooks/hostify", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
