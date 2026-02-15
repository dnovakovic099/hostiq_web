import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";
import type { UserRole } from "@hostiq/shared";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string | null;
}

export function signToken(payload: JWTPayload, expiresIn = "7d"): string {
  return jwt.sign(payload, env.NEXTAUTH_SECRET, { expiresIn });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.NEXTAUTH_SECRET) as JWTPayload;
}

export function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateResetToken(): string {
  return generateInviteToken();
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  INTERNAL_OPS: 80,
  OWNER: 50,
  CLEANER: 10,
};

export function hasPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
