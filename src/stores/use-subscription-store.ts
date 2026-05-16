import { create } from "zustand";
import { authClient } from "@/lib/auth-client";

// Move types here to avoid cycle or keep in types file.
// For now, I'll duplicate/define here and export, then update hook to import from here.

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "canceled"
  | "updated"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "all";

export interface SubscriptionData {
  planId: string;
  planName: string;
  credits: number;
  limit: number;
  periodEnd: string | null;
  isCanceled: boolean;
  status: SubscriptionStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

interface SubscriptionState {
  data: SubscriptionData | null;
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
  fetchSubscription: (force?: boolean) => Promise<void>;
  setData: (data: SubscriptionData | null) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  setData: (data) => set({ data }),
  fetchSubscription: async (force = false) => {
    const { isInitialized, isLoading } = get();
    // Prevent duplicate fetch or unnecessary fetch
    if (!force && (isInitialized || isLoading)) return;

    set({ isLoading: true, error: null });

    try {
      const [authResponse, dbResponse] = await Promise.allSettled([
        authClient.subscription.list(),
        fetch("/api/subscription").then((res) => {
          if (!res.ok) throw new Error("Failed to fetch DB subscription");
          return res.json();
        }),
      ]);

      // Process Auth Client Data
      let activeSub: any = null;

      if (authResponse.status === "fulfilled") {
        const { data: listData, error } = authResponse.value;
        if (!error) {
          activeSub = listData?.find(
            (sub: any) => sub.status === "active" || sub.status === "trialing",
          );
        }
      }

      // Process DB Data
      let dbData: any = null;
      if (dbResponse.status === "fulfilled") {
        dbData = dbResponse.value;
      }

      // Merge Data
      const planIdFull = activeSub?.plan || dbData?.plan || "free";
      const isPro = planIdFull.startsWith("pro-");

      // Credits come primarily from DB (actual balance), fallback to plan limit parsing
      const parsedCredits = isPro ? parseInt(planIdFull.split("-")[1] || "0", 10) : 0;
      const credits = dbData?.credits !== undefined ? dbData.credits : parsedCredits;

      // Calculate Limit
      const limit = isPro ? parsedCredits : 400;

      // Normalize plan name
      const planName = isPro
        ? `Pro Plan (${parsedCredits} credits)`
        : dbData?.plan === "FREE"
          ? "Free Plan"
          : "Free Plan";

      // Cancellation status
      const isCanceled = !!(activeSub as any)?.cancelAtPeriodEnd;

      // Period End
      const rawPeriodEnd =
        (activeSub as any)?.currentPeriodEnd ||
        (activeSub as any)?.current_period_end ||
        dbData?.periodEnd;

      const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd).toISOString() : null;

      set({
        data: {
          planId: isPro ? "pro" : "free",
          planName,
          credits,
          limit,
          periodEnd,
          isCanceled,
          status: activeSub?.status || "active",
          raw: { ...activeSub, db: dbData },
        },
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      set({
        error: error instanceof Error ? error : new Error("Unknown error"),
        isLoading: false,
        // Set default empty data on error so UI doesn't crash
        data: {
          planId: "free",
          planName: "Free Plan",
          credits: 0,
          limit: 400,
          periodEnd: null,
          isCanceled: false,
          status: "canceled",
          raw: null,
        },
        isInitialized: true,
      });
    }
  },
}));
