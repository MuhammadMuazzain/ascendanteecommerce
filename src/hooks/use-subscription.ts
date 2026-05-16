import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import {
  useSubscriptionStore,
  type SubscriptionData,
  type SubscriptionStatus,
} from "@/stores/use-subscription-store";

export type { SubscriptionData, SubscriptionStatus };

export function useSubscription() {
  const { data, isLoading, error, fetchSubscription } = useSubscriptionStore();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session) {
      // Trigger fetch. The store handles de-duplication/caching.
      fetchSubscription();
    }
  }, [session, fetchSubscription]);

  const defaultData: SubscriptionData = {
    planId: "free",
    planName: "Free Plan",
    credits: 0,
    limit: 400,
    periodEnd: null,
    isCanceled: false,
    status: "canceled",
    raw: null,
  };

  return {
    ...(data || defaultData),
    isLoading: isLoading && !data, // Only show loading if we have no data
    error,
    refetch: () => fetchSubscription(true),
  };
}
