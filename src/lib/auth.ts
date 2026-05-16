import { betterAuth, LogLevel } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { sendMagicLinkEmail } from "../../email/magic-link";
import { resend } from "./resend";
import { Pool } from "pg";
import { subscriptionQueries } from "./database";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { STRIPE_PRICE_MAPPING } from "../config/stripe-config";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-02-25.clover",
});

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL || "database_url",
    ssl: { rejectUnauthorized: false },
  }),
  logger: {
    log: (
      level: Exclude<LogLevel, "success">,
      message: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      console[level](`[${level}] ${message}`, ...args);
    },
  },
  user: {
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      idToken: "id_token",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  plugins: [
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      schema: {
        subscription: {
          fields: {
            referenceId: "reference_id",
            stripeCustomerId: "stripe_customer_id",
            stripeSubscriptionId: "stripe_subscription_id",
            periodStart: "period_start",
            periodEnd: "period_end",
            cancelAtPeriodEnd: "cancel_at_period_end",
            trialStart: "trial_start",
            trialEnd: "trial_end",
          },
        },
        user: {
          fields: {
            stripeCustomerId: "stripe_customer_id",
          },
        },
      },
      subscription: {
        enabled: true,
        plans: [
          ...Object.entries(STRIPE_PRICE_MAPPING).map(([credits, priceId]) => ({
            name: `pro-${credits}`,
            priceId,
          })),
          {
            name: "free",
            priceId: "free",
            free: true,
          },
        ],
      },
    }),
    magicLink({
      expiresIn: 60 * 60,
      sendMagicLink: async ({ email, token, url }) => {
        const magicLink = `${url}?token=${token}`;
        console.log({
          magicLink,
        });
        await resend.emails.send({
          from: `"Login" <account@scenify.io>`,
          to: email,
          subject: "Your login request to Scenify",
          react: sendMagicLinkEmail({ email, magicLink }),
        });
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await subscriptionQueries.create({
              id: crypto.randomUUID(),
              user_id: user.id,
              plan: "FREE",
              credits: 400,
              period_end: null,
              stripe_customer_id: null,
              stripe_subscription_id: null,
              status: "active",
            });
            console.log(`Created default subscription for user ${user.id}`);
          } catch (error) {
            console.error(`Failed to create subscription for user ${user.id}`, error);
          }
        },
      },
    },
  },
});
