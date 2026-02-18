import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load .env.local from project root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.local") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Auth
  NEXTAUTH_SECRET: z.string().min(10),

  // Hostify
  HOSTIFY_API_KEY: z.string().min(1),
  HOSTIFY_BASE_URL: z.string().url().default("https://api-rms.hostify.com"),
  HOSTIFY_WEBHOOK_AUTH_SECRET: z.string().optional(),

  // HostBuddy
  HOSTBUDDY_WEBHOOK_SECRET: z.string().optional(),

  // OpenPhone
  OPENPHONE_API_KEY: z.string().optional(),
  OPENPHONE_PHONE_NUMBER: z.string().optional(),
  OPENPHONE_BASE_URL: z
    .string()
    .url()
    .default("https://api.openphone.com/v1"),

  // SecureStay
  SECURESTAY_API_KEY: z.string().optional(),
  SECURESTAY_BASE_URL: z
    .string()
    .url()
    .default("https://securestay.ai/securestay_api"),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // QuickBooks
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_BASE_URL: z
    .string()
    .url()
    .default("https://quickbooks.api.intuit.com"),

  // RentCast
  RENTCAST_API_KEY: z.string().optional(),
  RENTCAST_BASE_URL: z.string().url().default("https://api.rentcast.io/v1"),

  // Airbtics
  AIRBTICS_API_KEY: z.string().optional(),
  AIRBTICS_BASE_URL: z
    .string()
    .url()
    .default(
      "https://crap0y5bx5.execute-api.us-east-2.amazonaws.com/prod"
    ),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // App
  API_URL: z.string().default("http://localhost:3001"),
  APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new Error("Missing required environment variables. Check .env.local");
}

export const env = parsed.data;
