"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { BillingScreen } from "@/components/billing/billing-screen";
import { useModalStore } from "@/stores/use-modal-store";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import PricingModal from "@/components/pricing-modal";
import { useSubscription } from "@/hooks/use-subscription";

const BillingPage = () => {
  const router = useRouter();
  const { isMobile, toggleSidebar } = useSidebar();
  const { setModalPricing } = useModalStore();
  const {
    planName: hookPlanName,
    credits: hookCredits,
    periodEnd: hookPeriodEnd,
    isCanceled: hookIsCanceled,
    planId: hookPlanId,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const { data: session } = authClient.useSession();
  const user = session?.user;

  // Fetch subscription data with credits from database
  const [dbSubscription, setDbSubscription] = useState<{
    credits: number;
    plan: string;
  } | null>(null);

  // We can eventually move dbSubscription to the hook too or keep it separate
  // if it's strictly for database credit balance (which might differ from plan limits).
  // For now, removing the manual authClient.subscription.list() call.

  useEffect(() => {
    const fetchDbSubscription = async () => {
      try {
        const response = await fetch("/api/subscription");
        if (response.ok) {
          const data = await response.json();
          setDbSubscription(data);
        }
      } catch (error) {
        console.error("Error fetching subscription data:", error);
      }
    };

    if (!isSubscriptionLoading) {
      fetchDbSubscription();
    }
  }, [isSubscriptionLoading]);

  const handleViewPlans = () => {
    setModalPricing(true);
  };

  const handleCancelPlan = async () => {
    if (!hookPlanId || hookPlanId === "free") return;

    try {
      const { error } = await authClient.subscription.cancel({
        returnUrl: "/billing",
      });
      if (error) {
        toast.error(error.message || "Failed to cancel subscription");
        return;
      }
      toast.success("Subscription canceled successfully");
      // Reload subscription
      await refetch();
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while cancelling subscription");
    }
  };

  const handleBuyCredits = () => {
    toast.info("Buy credits feature coming soon");
  };

  const handleEnableAutoRecharge = () => {
    toast.info("Auto-recharge feature coming soon");
  };

  if (isSubscriptionLoading) {
    return (
      <main className="w-full h-screen flex-1">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  // Map subscription data to BillingScreen props
  const planId = hookPlanId || "free";
  const credits = hookCredits || 0;
  const monthlyPrice = credits > 0 ? Math.round((credits / 2000) * 19.99) : 0;

  // Map subscription data to BillingScreen props
  // We use hookPlanId to verify if there is an active subscription (assuming 'free' is default formatting but 'pro' means active paid)
  // Or checking if hookPlanId IS defined.
  // Actually, planName handles the text.
  // We just need a boolean "hasActiveProSubscription"?
  const hasActiveProSubscription = hookPlanId && hookPlanId !== "free";
  // But planPrice logic in original was `activeSubscription ? ... : '$0/mo'`.
  // If free plan, original code `activeSubscription` was probably null?
  // In hook: if free, we return planId='free', status='canceled' or 'active' (if truly free tier).
  // Assuming if we are on 'free', price is $0.
  const planName = hookPlanName;
  const planPrice = hasActiveProSubscription ? `$${monthlyPrice}/mo` : "$0/mo";

  // Use hookPeriodEnd directly
  const renewalDate = hookPeriodEnd
    ? new Date(hookPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  console.log("dbSubscription", dbSubscription);
  console.log("user", user);
  // Calculate credit values
  const totalCredits = dbSubscription?.credits || 0;
  const totalBalance = totalCredits.toString();
  const username = user?.name || "User";

  // For now, show all credits as monthly credits
  // In the future, you can split this into gifted, monthly, and purchased
  const giftedCredits = "0";
  const monthlyCredits = totalCredits.toString();
  const monthlyCreditsLimit = credits.toString();
  const purchasedCredits = "0";

  const resetDays = hookPeriodEnd
    ? Math.ceil((new Date(hookPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <main className="w-full h-screen flex-1">
      <ScrollArea className="h-full">
        <div className="h-14 flex items-center p-4 justify-between text-sm font-medium border-b sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button className="rounded-full" size="icon" variant="ghost" onClick={toggleSidebar}>
                <Icons.menu className="size-5" />
              </Button>
            )}
            Billing
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => router.push("/account")}
          >
            Account
          </Button>
        </div>
        <BillingScreen
          className="p-0"
          planName={planName}
          planPrice={planPrice}
          renewalDate={renewalDate}
          totalBalance={totalBalance}
          username={username}
          giftedCredits={giftedCredits}
          monthlyCredits={monthlyCredits}
          monthlyCreditsLimit={monthlyCreditsLimit}
          purchasedCredits={purchasedCredits}
          resetDays={resetDays}
          autoRechargeEnabled={false}
          onViewPlans={handleViewPlans}
          onCancelPlan={handleCancelPlan}
          onBuyCredits={handleBuyCredits}
          onEnableAutoRecharge={handleEnableAutoRecharge}
          isCanceled={hookIsCanceled}
        />
      </ScrollArea>
      <PricingModal />
    </main>
  );
};

export default BillingPage;
