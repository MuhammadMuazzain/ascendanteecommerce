import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { subscriptionQueries } from "@/lib/database/subscription-queries";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await subscriptionQueries.findByUserId(session.user.id);

    if (!subscription) {
      return NextResponse.json({
        plan: "FREE",
        credits: 0,
        periodEnd: null,
      });
    }

    return NextResponse.json({
      plan: subscription.plan,
      credits: subscription.credits,
      periodEnd: subscription.period_end,
      customerId: subscription.stripe_customer_id,
      subscriptionId: subscription.stripe_subscription_id,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}
