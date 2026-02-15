import { Hono } from "hono";
import { z } from "zod";
import { prisma } from "@hostiq/db";
import {
  hashPassword,
  verifyPassword,
  signToken,
  generateInviteToken,
  generateResetToken,
} from "../lib/auth";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../middleware/audit";

const auth = new Hono();

// ============================================
// POST /auth/register
// ============================================
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const { email, password, name, phone } = parsed.data;

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ success: false, error: "Email already registered" }, 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone,
      role: "OWNER", // Default role for self-registration
    },
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await logAudit(user.id, "register", "user", user.id, { email }, c.req.header("x-forwarded-for"));

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

// ============================================
// POST /auth/login
// ============================================
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid credentials" }, 400);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  // Create session record
  await prisma.session.create({
    data: {
      userId: user.id,
      deviceInfo: c.req.header("user-agent"),
      ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await logAudit(user.id, "login", "user", user.id, undefined, c.req.header("x-forwarded-for"));

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

// ============================================
// GET /auth/me
// ============================================
auth.get("/me", requireAuth(), async (c) => {
  const authUser = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      mfaEnabled: true,
      timezone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  return c.json({ success: true, data: user });
});

// ============================================
// POST /auth/forgot-password
// ============================================
const forgotSchema = z.object({
  email: z.string().email(),
});

auth.post("/forgot-password", async (c) => {
  const body = await c.req.json();
  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid email" }, 400);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return c.json({ success: true, message: "If the email exists, a reset link has been sent" });
  }

  const resetToken = generateResetToken();

  // Store reset token as an invite (reuse invite table with special role)
  await prisma.invite.create({
    data: {
      email: user.email,
      role: user.role,
      propertyIds: [],
      token: resetToken,
      sentById: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // TODO: Send email via Resend with reset link
  console.log(`[Auth] Password reset token for ${user.email}: ${resetToken}`);

  await logAudit(user.id, "forgot_password", "user", user.id, undefined, c.req.header("x-forwarded-for"));

  return c.json({ success: true, message: "If the email exists, a reset link has been sent" });
});

// ============================================
// POST /auth/reset-password
// ============================================
const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

auth.post("/reset-password", async (c) => {
  const body = await c.req.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Invalid request" }, 400);
  }

  const { token, password } = parsed.data;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
    return c.json({ success: false, error: "Invalid or expired token" }, 400);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { email: invite.email },
    data: { passwordHash },
  });

  await prisma.invite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  await logAudit(null, "reset_password", "user", undefined, { email: invite.email }, c.req.header("x-forwarded-for"));

  return c.json({ success: true, message: "Password reset successful" });
});

// ============================================
// POST /auth/invite
// ============================================
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "CLEANER", "INTERNAL_OPS", "ADMIN"]),
  propertyIds: z.array(z.string()).optional(),
});

auth.post("/invite", requireAuth(), async (c) => {
  const authUser = c.get("user");

  // Only ADMIN and OWNER can invite
  if (!["ADMIN", "OWNER", "INTERNAL_OPS"].includes(authUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const body = await c.req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const { email, role, propertyIds } = parsed.data;

  // Owners can only invite cleaners
  if (authUser.role === "OWNER" && role !== "CLEANER") {
    return c.json({ success: false, error: "Owners can only invite cleaners" }, 403);
  }

  const token = generateInviteToken();

  const invite = await prisma.invite.create({
    data: {
      email,
      role,
      propertyIds: propertyIds ?? [],
      token,
      sentById: authUser.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // TODO: Send invite email via Resend
  console.log(`[Auth] Invite sent to ${email} with token: ${token}`);

  await logAudit(authUser.userId, "send_invite", "invite", invite.id, { email, role }, c.req.header("x-forwarded-for"));

  return c.json({
    success: true,
    data: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    },
  });
});

// ============================================
// POST /auth/accept-invite
// ============================================
const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

auth.post("/accept-invite", async (c) => {
  const body = await c.req.json();
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const { token, password, name, phone } = parsed.data;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
    return c.json({ success: false, error: "Invalid or expired invite" }, 400);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    return c.json({ success: false, error: "Account already exists for this email" }, 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      passwordHash,
      name,
      phone,
      role: invite.role,
    },
  });

  // If invite is for a cleaner with assigned properties, create cleaner record
  if (invite.role === "CLEANER") {
    await prisma.cleaner.create({
      data: {
        userId: user.id,
        name,
        phone,
        email: user.email,
      },
    });
  }

  await prisma.invite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  const authToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await logAudit(user.id, "accept_invite", "user", user.id, { inviteId: invite.id }, c.req.header("x-forwarded-for"));

  return c.json({
    success: true,
    data: {
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  });
});

// ============================================
// GET /auth/sessions
// ============================================
auth.get("/sessions", requireAuth(), async (c) => {
  const authUser = c.get("user");

  const sessions = await prisma.session.findMany({
    where: { userId: authUser.userId },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      createdAt: true,
      lastActiveAt: true,
      expiresAt: true,
    },
  });

  return c.json({ success: true, data: sessions });
});

// ============================================
// DELETE /auth/sessions/:id
// ============================================
auth.delete("/sessions/:id", requireAuth(), async (c) => {
  const authUser = c.get("user");
  const sessionId = c.req.param("id");

  await prisma.session.deleteMany({
    where: { id: sessionId, userId: authUser.userId },
  });

  return c.json({ success: true, message: "Session revoked" });
});

export default auth;
