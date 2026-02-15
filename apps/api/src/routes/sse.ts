/**
 * SSE (Server-Sent Events) routes.
 *
 * Wire-up in server.ts:
 *   import sseRoutes from "./routes/sse";
 *   api.route("/sse", sseRoutes);
 *
 * Also call registerSSEBridge() at startup (e.g. from events/index.ts).
 */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { nanoid } from "nanoid";
import { prisma } from "@hostiq/db";
import { verifyToken } from "../lib/auth";
import type { UserRole } from "@hostiq/shared";

// ============================================
// SSE Event Types (frontend-facing)
// ============================================
export const SSE_EVENT_TYPES = {
  RESERVATION_NEW: "reservation.new",
  RESERVATION_UPDATED: "reservation.updated",
  MESSAGE_NEW: "message.new",
  ISSUE_NEW: "issue.new",
  ESCALATION_NEW: "escalation.new",
  CLEANING_UPDATED: "cleaning.updated",
  SYNC_PROGRESS: "sync.progress",
  HEALTH_CHANGED: "health.changed",
} as const;

export type SSEEventType = (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];

// ============================================
// SSE Manager (Singleton)
// ============================================
export interface SSEClient {
  stream: { writeSSE: (msg: { data: string; event?: string; id?: string }) => Promise<void> };
  userId: string;
  role: UserRole;
  propertyIds: string[] | null; // null = all properties (Admin/InternalOps)
}

class SSEManagerClass {
  private clients = new Map<string, SSEClient>();
  private readonly HEARTBEAT_INTERVAL_MS = 30_000;

  async addClient(
    userId: string,
    role: UserRole,
    stream: SSEClient["stream"]
  ): Promise<string> {
    const connectionId = nanoid();

    // Fetch property IDs for owners/cleaners (Admin/InternalOps see all)
    let propertyIds: string[] | null = null;
    if (role === "OWNER") {
      const properties = await prisma.property.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      propertyIds = properties.map((p) => p.id);
    } else if (role === "CLEANER") {
      const cleaner = await prisma.cleaner.findUnique({
        where: { userId },
        include: {
          primaryAssignments: { select: { propertyId: true } },
          backupAssignments: { select: { propertyId: true } },
        },
      });
      if (cleaner) {
        const ids = new Set<string>();
        cleaner.primaryAssignments.forEach((a) => ids.add(a.propertyId));
        cleaner.backupAssignments.forEach((a) => ids.add(a.propertyId));
        propertyIds = Array.from(ids);
      } else {
        propertyIds = [];
      }
    }

    this.clients.set(connectionId, { stream, userId, role, propertyIds });
    return connectionId;
  }

  removeClient(connectionId: string): void {
    this.clients.delete(connectionId);
  }

  private userHasAccessToProperty(client: SSEClient, propertyId: string | null): boolean {
    if (!propertyId) return true;
    if (client.role === "ADMIN" || client.role === "INTERNAL_OPS") return true;
    if (client.propertyIds === null) return true;
    return client.propertyIds.includes(propertyId);
  }

  broadcast(event: SSEEventType, data: unknown, propertyId?: string | null): void {
    const payload = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const [connectionId, client] of this.clients) {
      if (!this.userHasAccessToProperty(client, propertyId ?? null)) continue;
      client.stream.writeSSE({ data: payload }).catch(() => {
        this.removeClient(connectionId);
      });
    }
  }

  sendToUser(userId: string, event: SSEEventType, data: unknown, propertyId?: string | null): void {
    const payload = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const [connectionId, client] of this.clients) {
      if (client.userId !== userId) continue;
      if (!this.userHasAccessToProperty(client, propertyId ?? null)) continue;
      client.stream.writeSSE({ data: payload }).catch(() => {
        this.removeClient(connectionId);
      });
    }
  }

  sendToRole(role: UserRole, event: SSEEventType, data: unknown, propertyId?: string | null): void {
    const payload = JSON.stringify({
      type: event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const [connectionId, client] of this.clients) {
      if (client.role !== role) continue;
      if (!this.userHasAccessToProperty(client, propertyId ?? null)) continue;
      client.stream.writeSSE({ data: payload }).catch(() => {
        this.removeClient(connectionId);
      });
    }
  }

  getClientStreams(): Map<string, SSEClient> {
    return new Map(this.clients);
  }
}

export const sseManager = new SSEManagerClass();

// ============================================
// SSE Routes
// ============================================
const sse = new Hono();

sse.get("/stream", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ success: false, error: "Missing token" }, 401);
  }

  let payload: { userId: string; role: UserRole };
  try {
    payload = verifyToken(token);
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  return streamSSE(c, async (stream) => {
    const connectionId = await sseManager.addClient(payload.userId, payload.role, stream);

    stream.onAbort(() => {
      sseManager.removeClient(connectionId);
    });

    try {
      while (true) {
        await stream.writeSSE({
          data: JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }),
          event: "heartbeat",
          id: nanoid(),
        });
        await stream.sleep(30_000);
      }
    } catch {
      // Client disconnected
    } finally {
      sseManager.removeClient(connectionId);
    }
  });
});

export default sse;
