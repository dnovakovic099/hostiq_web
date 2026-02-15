import { Context, Next } from "hono";
import { prisma } from "@hostiq/db";

/**
 * Log an audit event
 */
export async function logAudit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  payload?: unknown,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
        ipAddress,
      },
    });
  } catch (err) {
    console.error("[Audit] Failed to log:", err);
  }
}

/**
 * Middleware: automatically log requests to sensitive endpoints
 */
export function auditMiddleware(action: string, entityType: string) {
  return async (c: Context, next: Next) => {
    await next();

    const user = c.get("user") as { userId: string } | undefined;
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      "unknown";

    await logAudit(
      user?.userId ?? null,
      action,
      entityType,
      undefined,
      undefined,
      ip
    );
  };
}
