import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  //BASE_URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  plugins: [
    magicLinkClient(),
    emailOTPClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});
