"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import type { Plan } from "@/lib/billingsdk-config";

// Internal CreditCard component (not exported)
function CreditCard({
  balance,
  username,
  className,
}: {
  balance: string;
  username: string;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), {
    stiffness: 300,
    damping: 30,
  });

  const shineX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), {
    stiffness: 200,
    damping: 25,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-md font-sans", className)}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative w-full overflow-hidden bg-zinc-950 p-6 shadow-xl ring ring-black/10 dark:bg-zinc-900"
        style={{
          aspectRatio: "190/123",
          alignSelf: "stretch",
          borderRadius: "12px",
          rotateX,
          rotateY,
          transformPerspective: 1000,
          scale: 1,
          transition: "box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)",
        }}
        whileHover={{
          scale: 1.02,
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)",
        }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{
            width: "60%",
            height: "100%",
            background:
              "linear-gradient(90deg, transparent 0%, transparent 20%, rgba(128,128,128,0.1) 30%, rgba(128,128,128,0.2) 50%, rgba(128,128,128,0.1) 70%, transparent 80%, transparent 100%)",
            filter: "blur(2px)",
            mixBlendMode: "normal",
            opacity: 0.7,
            x: shineX,
            skewX: -15,
          }}
        />

        {/* Top edge highlight */}
        <motion.div
          className="pointer-events-none absolute top-0 right-0 left-0 h-1"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
            borderRadius: "12px 12px 0 0",
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Left edge highlight */}
        <motion.div
          className="pointer-events-none absolute top-0 bottom-0 left-0 w-1"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
            borderRadius: "12px 0 0 12px",
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Bottom edge highlight */}
        <motion.div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-1"
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
            borderRadius: "0 0 12px 12px",
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Right edge highlight */}
        <motion.div
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-1"
          style={{
            background:
              "linear-gradient(270deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)",
            borderRadius: "0 12px 12px 0",
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Card content */}
        <div className="relative z-10 h-full">
          {/* Centered amount and username */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-5xl font-bold tracking-tight text-zinc-200">{balance}</div>
            <div className="mt-1 text-base font-medium text-zinc-400">{username}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = ({ title, children }: SectionProps) => (
  <>
    <div className="py-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
    <Separator className="bg-white/20" />
  </>
);

export interface BillingScreenProps {
  className?: string;
  // Plan details
  planName?: string;
  planPrice?: string;
  renewalDate?: string;
  // Credit details
  totalBalance?: string;
  username?: string;
  giftedCredits?: string;
  monthlyCredits?: string;
  monthlyCreditsLimit?: string;
  purchasedCredits?: string;
  // Settings
  resetDays?: number;
  autoRechargeEnabled?: boolean;
  // Callbacks
  onViewPlans?: () => void;
  onCancelPlan?: () => void;
  onBuyCredits?: () => void;
  onEnableAutoRecharge?: () => void;
  isCanceled?: boolean;
}

export function BillingScreen({
  className,
  planName = "Premium Plan",
  planPrice = "$20/mo",
  renewalDate = "Oct 7, 2025",
  totalBalance = "0",
  username = "rajoninternet",
  giftedCredits = "0",
  monthlyCredits = "0",
  monthlyCreditsLimit = "2000",
  purchasedCredits = "0",
  resetDays = 4,
  autoRechargeEnabled = false,
  isCanceled = false,
  onViewPlans,
  onCancelPlan,
  onBuyCredits,
  onEnableAutoRecharge,
}: BillingScreenProps) {
  return (
    <div className={cn("text-foreground", className)}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Current Plan Section */}
        <Section title="Current Plan">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{planName}</p>
              <p className="text-muted-foreground text-sm">
                {planPrice} • {isCanceled ? "Expires on" : "Renews on"} {renewalDate}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-full h-11 font-medium text-sm"
                onClick={onViewPlans}
              >
                View Plans
              </Button>
              {!isCanceled && (
                <CancelSubscriptionDialog
                  title="Cancel Subscription"
                  description="Are you sure you want to cancel your subscription?"
                  plan={{
                    id: "current-plan",
                    title: planName,
                    description: "Your current active plan.",
                    monthlyPrice: planPrice,
                    yearlyPrice: planPrice,
                    currency: planPrice.includes("$") ? "$" : "",
                    buttonText: "Cancel",
                    features: [
                      { name: "Access to all premium features", icon: "check" },
                      { name: "Priority support", icon: "check" },
                    ],
                  }}
                  triggerButtonText="Cancel"
                  triggerButtonClassName="rounded-full h-11 font-medium text-sm"
                  onCancel={async () => onCancelPlan?.()}
                  confirmButtonText="Yes, Cancel Subscription"
                  continueButtonText="Continue Cancellation"
                />
              )}
            </div>
          </div>
        </Section>

        {/* Credit Balance Section */}
        <Section title="Credit Balance">
          <div className="space-y-4">
            {/* Credit info header */}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Your monthly credits reset in{" "}
                <span className="text-foreground font-semibold">{resetDays} days</span>
              </p>
              <Button className="rounded-full h-11 font-medium text-sm" onClick={onBuyCredits}>
                Buy Credits
              </Button>
            </div>

            {/* Credit card and breakdown */}
            <div className="flex flex-col gap-6 md:flex-row md:items-start py-3">
              {/* Credit Card Visual */}
              <div className="w-52 flex-shrink-0">
                <CreditCard balance={totalBalance} username={username} />
              </div>

              {/* Credit Breakdown */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Gifted Credits</span>
                  <span className="font-mono">{giftedCredits.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Monthly Credits</span>
                    <InfoIcon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <span className="font-mono">
                    {Number(monthlyCredits).toLocaleString()} /{" "}
                    {Number(monthlyCreditsLimit).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Purchased Credits</span>
                    <InfoIcon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <span className="font-mono">{Number(purchasedCredits).toLocaleString()}</span>
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold">Total Available Credits</span>
                  <span className="font-mono font-semibold">
                    {Number(totalBalance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Auto-recharge Section */}
        <Section title="Auto-recharge">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">
                Auto-recharge is {autoRechargeEnabled ? "enabled" : "disabled"}
              </p>
              <p className="text-muted-foreground text-sm">
                {autoRechargeEnabled
                  ? "Credits will be automatically added when your balance is low."
                  : "Enable to automatically add credits when your balance is low."}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full h-11 w-[110px] font-medium text-sm"
              onClick={onEnableAutoRecharge}
            >
              {autoRechargeEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
