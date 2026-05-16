import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { subscriptionQueries } from "@/lib/database/subscription-queries";
import { db } from "@/lib/database";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      // BYPASS FOR DEV: If validation fails in dev, try to proceed anyway by parsing the body directly
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️ DEV MODE: Bypassing signature verification failure. proceeding with unverified event.",
        );
        try {
          event = JSON.parse(body) as Stripe.Event;
        } catch (e) {
          return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    // Get the user ID from the stripe_customer_id
    const user = await db
      .selectFrom("user")
      .select("id")
      .where("stripe_customer_id", "=", customerId)
      .executeTakeFirst();

    if (!user) {
      console.error("User not found for customer:", customerId);
      return;
    }

    // Extract plan name and period from subscription items
    const subscriptionItem = subscription.items.data[0];
    if (!subscriptionItem) {
      console.error("No subscription item found in subscription");
      return;
    }

    const priceId = subscriptionItem.price.id;
    if (!priceId) {
      console.error("No price ID found in subscription");
      return;
    }

    // Get current_period_end from subscription item (API version 2025-03-31+) OR top level (older versions)
    const currentPeriodEnd =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (subscription as any).current_period_end || subscriptionItem.current_period_end;
    if (!currentPeriodEnd) {
      console.error("No current_period_end found in subscription item");
      return;
    }

    // Find the plan name from STRIPE_PRICE_MAPPING
    const { STRIPE_PRICE_MAPPING } = await import("@/config/stripe-config");
    const planEntry = Object.entries(STRIPE_PRICE_MAPPING).find(([, id]) => id === priceId);

    if (!planEntry) {
      console.error("Plan not found for price ID:", priceId);
      return;
    }

    const credits = parseInt(planEntry[0]);
    const planName = `pro-${credits}`;

    // Update or create subscription in custom table
    const existingSubscription = await subscriptionQueries.findByUserId(user.id);

    if (existingSubscription) {
      await subscriptionQueries.update(existingSubscription.id, {
        plan: "PRO",
        credits,
        period_end: new Date(currentPeriodEnd * 1000),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: "active",
      });
      console.log(`Updated subscription for user ${user.id}: ${planName}, ${credits} credits`);
    } else {
      await subscriptionQueries.create({
        id: crypto.randomUUID(),
        user_id: user.id,
        plan: "PRO",
        credits,
        period_end: new Date(currentPeriodEnd * 1000),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: "active",
      });
      console.log(`Created subscription for user ${user.id}: ${planName}, ${credits} credits`);
    }
  } catch (error) {
    console.error("Error handling subscription change:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    // Get the user ID from the stripe_customer_id
    const user = await db
      .selectFrom("user")
      .select("id")
      .where("stripe_customer_id", "=", customerId)
      .executeTakeFirst();

    if (!user) {
      console.error("User not found for customer:", customerId);
      return;
    }

    // Revert to free plan
    const existingSubscription = await subscriptionQueries.findByUserId(user.id);

    if (existingSubscription) {
      await subscriptionQueries.update(existingSubscription.id, {
        plan: "FREE",
        credits: 400,
        period_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: "canceled",
      });
      console.log(`Reverted user ${user.id} to FREE plan`);
    }
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
    throw error;
  }
}
