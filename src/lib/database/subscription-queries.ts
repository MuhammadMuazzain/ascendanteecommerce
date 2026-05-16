import { db } from "./index";
import { withDbRetry } from "./retry";
import type { Subscription, NewSubscription, SubscriptionUpdate } from "./types";

/**
 * Subscription-related database operations
 */
export const subscriptionQueries = {
  /**
   * Find a subscription by user ID
   */
  async findByUserId(userId: string): Promise<Subscription | undefined> {
    return await withDbRetry(() =>
      db
        .selectFrom("subscription")
        .selectAll()
        .where("user_id", "=", userId)
        .executeTakeFirst(),
    );
  },

  /**
   * Create a new subscription
   */
  async create(subscriptionData: NewSubscription): Promise<Subscription> {
    return await db
      .insertInto("subscription")
      .values(subscriptionData)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Update a subscription
   */
  async update(id: string, updates: SubscriptionUpdate): Promise<Subscription> {
    return await db
      .updateTable("subscription")
      .set(updates)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Add credits to a subscription
   */
  async addCredits(userId: string, amount: number): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return await this.update(subscription.id, {
      credits: subscription.credits + amount,
    });
  },

  /**
   * Deduct credits from a subscription
   */
  async deductCredits(userId: string, amount: number): Promise<Subscription> {
    const subscription = await this.findByUserId(userId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.credits < amount) {
      throw new Error("Insufficient credits");
    }

    return await this.update(subscription.id, {
      credits: subscription.credits - amount,
    });
  },
};
