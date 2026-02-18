import { Hono } from "hono";
import Stripe from "stripe";
import { prisma } from "@hostiq/db";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";

const billing = new Hono();

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

// ============================================
// GET /billing/status — current subscription state
// ============================================
billing.get("/status", requireAuth(), async (c) => {
  const user = c.get("user");
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { subscriptionStatus: true, subscriptionEndsAt: true },
  });

  return c.json({
    success: true,
    data: {
      subscriptionStatus: dbUser?.subscriptionStatus ?? "FREE",
      subscriptionEndsAt: dbUser?.subscriptionEndsAt ?? null,
    },
  });
});

// ============================================
// POST /billing/checkout — create Stripe Checkout Session
// ============================================
billing.post("/checkout", requireAuth(), async (c) => {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return c.json({ success: false, error: "Stripe is not configured" }, 503);
  }

  const stripe = getStripe();
  const user = c.get("user");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { email: true, name: true, stripeCustomerId: true, subscriptionStatus: true },
  });

  if (!dbUser) {
    return c.json({ success: false, error: "User not found" }, 404);
  }

  if (dbUser.subscriptionStatus === "ACTIVE") {
    return c.json({ success: false, error: "Already subscribed" }, 400);
  }

  let customerId = dbUser.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      metadata: { userId: user.userId },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${env.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/billing`,
    allow_promotion_codes: true,
    metadata: { userId: user.userId },
    subscription_data: {
      metadata: { userId: user.userId },
    },
  });

  return c.json({ success: true, data: { url: session.url } });
});

// ============================================
// POST /billing/portal — Stripe Customer Portal
// ============================================
billing.post("/portal", requireAuth(), async (c) => {
  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ success: false, error: "Stripe is not configured" }, 503);
  }

  const stripe = getStripe();
  const user = c.get("user");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { stripeCustomerId: true },
  });

  if (!dbUser?.stripeCustomerId) {
    return c.json({ success: false, error: "No billing account found" }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${env.APP_URL}/billing`,
  });

  return c.json({ success: true, data: { url: session.url } });
});

// ============================================
// POST /billing/webhook — Stripe webhook handler
// ============================================
billing.post("/webhook", async (c) => {
  if (!env.STRIPE_SECRET_KEY) {
    return c.json({ error: "Stripe not configured" }, 503);
  }

  const stripe = getStripe();
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();

  if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: "Missing signature or webhook secret" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return c.json({ error: "Webhook signature verification failed" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.subscription) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "ACTIVE",
              stripeSubscriptionId: session.subscription as string,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          const status =
            sub.status === "active" ? "ACTIVE"
            : sub.status === "past_due" ? "PAST_DUE"
            : sub.status === "canceled" ? "CANCELLED"
            : null;

          if (status) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: status,
                subscriptionEndsAt: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : undefined,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: "CANCELLED",
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: "PAST_DUE" },
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: "ACTIVE" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", event.type, err);
    return c.json({ error: "Webhook processing failed" }, 500);
  }

  return c.json({ received: true });
});

export default billing;
