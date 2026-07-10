import { Router } from "express";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY as string,
  annual: process.env.STRIPE_PRICE_ANNUAL as string,
};

// POST /billing/checkout-session   { plan: "monthly" | "annual" }
router.post("/checkout-session", requireAuth, async (req: AuthedRequest, res) => {
  const { plan } = req.body;
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return res.status(400).json({ error: "plan must be 'monthly' or 'annual'" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  // Reuse an existing Stripe customer if we already created one for this user
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/billing/success`,
    cancel_url: `${process.env.FRONTEND_URL}/billing/cancelled`,
  });

  res.json({ url: session.url });
});

// POST /billing/portal-session — lets the user manage/cancel their subscription themselves
router.post("/portal-session", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.stripeCustomerId) {
    return res.status(400).json({ error: "No billing account found for this user" });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/`,
  });

  res.json({ url: portalSession.url });
});

// GET /billing/status — is the current user an active subscriber?
router.get("/status", requireAuth, async (req: AuthedRequest, res) => {
  const sub = await prisma.subscription.findFirst({
    where: { subscriberId: req.user!.userId, status: { in: ["active", "trialing"] } },
    orderBy: { createdAt: "desc" },
  });

  res.json({ isSubscribed: Boolean(sub), subscription: sub });
});

export default router;
