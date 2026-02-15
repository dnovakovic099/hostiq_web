import { Context, Next } from "hono";
import { verifyToken, hasPermission, type JWTPayload } from "../lib/auth";
import type { UserRole } from "@hostiq/shared";

// Extend Hono context with auth user
declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Middleware: require valid JWT token in Authorization header
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      c.set("user", payload);
      await next();
    } catch {
      return c.json({ success: false, error: "Invalid or expired token" }, 401);
    }
  };
}

/**
 * Middleware: require specific role (or higher in hierarchy)
 */
export function requireRole(role: UserRole) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    if (!hasPermission(user.role, role)) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
}

/**
 * Middleware: require one of the listed roles
 */
export function requireAnyRole(...roles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
}
