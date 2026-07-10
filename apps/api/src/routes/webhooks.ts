import { Router, raw } from "express";
import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/stripe", raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscriptionFromStripe(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionFromStripe(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: "canceled" },
      });
      break;
    }

    default:
      // Unhandled event types are fine to ignore
      break;
  }

  res.json({ received: true });
});

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
  if (!user) {
    console.error(`No local user found for Stripe customer ${customerId}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? "";
  const currentPeriodEnd = new Date(subscription.items.data[0].current_period_end * 1000);

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      subscriberId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodEnd,
    },
    update: {
      status: subscription.status,
      currentPeriodEnd,
      stripePriceId: priceId,
    },
  });
}

export default router;
