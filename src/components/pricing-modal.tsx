"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { useModalStore } from "@/stores/use-modal-store";
import { PricingTable, PricingTablePlan } from "./pricing-table";
import { authClient } from "@/lib/auth-client";
import { STRIPE_PRICE_MAPPING } from "@/config/stripe-config";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/use-subscription";

const CREDIT_COSTS = {
  STOCK_VIDEO: 15,
  AI_IMAGE: 40,
  AI_VIDEO_720P: 290,
  AI_VIDEO_1080P: 365,
};

export const SLIDER_STEPS = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

const PricingModal = () => {
  const { modalPricing, setModalPricing } = useModalStore();
  const [sliderIndex, setSliderIndex] = useState(0); // Index in SLIDER_STEPS
  const { planId, credits } = useSubscription();

  // Sync hook data to local state if needed, or just use hook data directly.
  const currentUserPlan = planId;
  const currentUserCredits = credits;

  const currentCredits = SLIDER_STEPS[sliderIndex] || 2000;

  // Dynamic Pro Plan Calculation
  const proPlan: PricingTablePlan = {
    id: "pro",
    name: "Pro",
    description: "For small businesses and marketers",
    price: Math.round((currentCredits / 2000) * 19.99),
    popular: true,
    users: 15,
    credits: `${currentCredits.toLocaleString()} credits / month`,
    creditsValue: currentCredits,
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Start testing at no cost",
      price: 0,
      popular: false,
      users: 1,
      credits: "400 credits / month",
      creditsValue: 400,
    },
    proPlan,
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For marketing and agency teams",
      price: 0,
      popular: false,
      users: 25,
      credits: "Customized",
      creditsValue: -1,
    },
  ];

  // Helper calculation for Pro column
  const calcStock = (credits: number) => Math.floor(credits / CREDIT_COSTS.STOCK_VIDEO);
  const calcAiImg = (credits: number) => Math.floor(credits / CREDIT_COSTS.AI_IMAGE);
  const calcAiVid = (credits: number) => Math.floor(credits / CREDIT_COSTS.AI_VIDEO_720P); // Using 720p as base

  const features = [
    {
      category: "Video Generation",
      items: [
        {
          name: "Credits",
          tooltip: true,
          free: "400 / mo",
          pro: `${currentCredits} / mo`,
          enterprise: "Customized",
        },
        {
          name: "Total videos using stock",
          tooltip: true,
          free: `${Math.floor(400 / CREDIT_COSTS.STOCK_VIDEO)}`, // 400/15 = 26.6 -> 26
          pro: `${calcStock(currentCredits)}`,
          enterprise: "Customized",
        },
        {
          name: "Total videos using AI images",
          tooltip: true,
          free: "—",
          pro: `${calcAiImg(currentCredits)}`,
          enterprise: "Customized",
        },
        {
          name: "Total videos using AI videos",
          tooltip: true,
          free: "—",
          pro: `${calcAiVid(currentCredits)}`,
          enterprise: "Customized",
        },
        {
          name: "Resolution",
          tooltip: true,
          free: "720p",
          pro: "1080p",
          enterprise: "Up to 4K",
        },
        {
          name: "Watermark",
          tooltip: true,
          free: "No watermark",
          pro: "No watermark",
          enterprise: "No watermark",
        },
        {
          name: "Commercial use",
          tooltip: true,
          free: "Allowed",
          pro: "Allowed",
          enterprise: "Allowed",
        },
      ],
    },

    {
      category: "Voice & Media",
      items: [
        {
          name: "Voices",
          tooltip: true,
          free: "Basic",
          pro: "210+",
          enterprise: "Full",
        },
        {
          name: "Languages",
          tooltip: true,
          free: "Basic",
          pro: "29",
          enterprise: "29",
        },
        {
          name: "Accents",
          tooltip: true,
          free: "Basic",
          pro: "40",
          enterprise: "40",
        },
        {
          name: "Video processing speed",
          tooltip: true,
          free: "Standard",
          pro: "Fast",
          enterprise: "Faster",
        },
        {
          name: "Aspect ratios",
          tooltip: true,
          free: "9:16, 4:5, 16:9, 1:1",
          pro: "9:16, 4:5, 16:9, 1:1",
          enterprise: "Customized",
        },
      ],
    },
    {
      category: "Custom Avatar & Voices",
      items: [
        {
          name: "Custom AI Avatar",
          tooltip: true,
          free: "Coming soon",
          pro: "Coming soon",
          enterprise: "Coming soon",
        },
        {
          name: "Custom Voices",
          tooltip: true,
          free: "Coming soon",
          pro: "Coming soon",
          enterprise: "Coming soon",
        },
      ],
    },
    {
      category: "Avatars",
      items: [
        {
          name: "Avatars",
          tooltip: true,
          free: "Coming soon",
          pro: "Coming soon",
          enterprise: "Coming soon",
        },
        {
          name: "Avatar emotions",
          tooltip: true,
          free: "Coming soon",
          pro: "Coming soon",
          enterprise: "Coming soon",
        },
        {
          name: "Change Avatar outfit & background",
          tooltip: true,
          free: "Coming soon",
          pro: "Coming soon",
          enterprise: "Coming soon",
        },
      ],
    },
    {
      category: "Additional Features",
      items: [
        {
          name: "AI Captions",
          tooltip: true,
          free: false,
          pro: true,
          enterprise: true,
        },

        {
          name: "AI Avatar",
          tooltip: true,
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "AI Shorts",
          tooltip: true,
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "AI Script Generation",
          tooltip: true,
          free: true,
          pro: true,
          enterprise: true,
        },

        {
          name: "AI Editing",
          tooltip: true,
          free: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Publish to YouTube Shorts, Reels, TikTok",
          tooltip: true,
          free: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Bulk Creation",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Custom Template",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "API Access",
          tooltip: true,
          free: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "API Volume Based Discount",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Done-for-You Creative Service",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Dedicated Account Manager",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "24/7 Priority Customer Support",
          tooltip: true,
          free: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  return (
    <Dialog open={modalPricing} onOpenChange={setModalPricing}>
      <DialogContent
        className="!w-screen !h-screen !max-w-none !max-h-none !top-0 !left-0 !translate-x-0 !translate-y-0 overflow-y-auto !rounded-none bg-card p-6"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Choose a plan</DialogTitle>
        <PricingTable
          plans={plans}
          features={features}
          title="Pick a plan or get started for free"
          description="Plans for creators, marketers, and agencies of all sizes."
          onPlanSelect={async (planId: string) => {
            if (planId === "pro") {
              const priceId = STRIPE_PRICE_MAPPING[currentCredits];
              if (!priceId) {
                toast.error("Invalid credit amount selected");
                return;
              }
              try {
                const planName = `pro-${currentCredits}`;
                const data = await authClient.subscription.upgrade({
                  plan: planName,
                  successUrl: "/home",
                  cancelUrl: "/pricing",
                });
                if (data.error) {
                  console.error("Upgrade failed:", data.error);
                  toast.error(`Failed to upgrade: ${data.error.message || "Unknown error"}`);
                  return;
                }
              } catch (error) {
                console.error(error);
                toast.error("An unexpected error occurred");
              }
            } else {
              console.log("Selected plan:", planId);
            }
          }}
          sliderValue={currentCredits}
          onSliderChange={(val) => {
            // Find closest step index or just update value if needed
            // But slider works with specific values, so we pass the exact value from step
            const index = SLIDER_STEPS.indexOf(val);
            if (index !== -1) {
              setSliderIndex(index);
            }
          }}
          sliderSteps={SLIDER_STEPS}
          currentPlan={currentUserPlan}
          currentCredits={currentUserCredits}
          size="small"
          theme="minimal"
          className="w-full"
        />
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
