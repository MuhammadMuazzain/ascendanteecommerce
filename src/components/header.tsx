"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import PricingModal from "./pricing-modal";
import ScenifyIcon from "./logos/scenify";
import { authClient } from "@/lib/auth-client";

export function Header() {
  const t = useTranslations();
  const { scrollY } = useScroll();
  const { data: session } = authClient.useSession();

  // Transform scroll position to height and background opacity
  const headerHeight = useTransform(scrollY, [0, 50], [68, 64]); // 80px to 64px (h-20 to h-16)
  const backgroundOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  return (
    <>
      <motion.header
        className="flex justify-between items-center px-5 sticky top-0 z-50"
        style={{ height: headerHeight }}
      >
        <motion.div
          className="absolute inset-0 bg-card/80 backdrop-blur-sm"
          style={{ opacity: backgroundOpacity }}
        />

        <div className="relative z-10 flex justify-between items-center w-full max-w-360 mx-auto">
          <Link href="/">
            <ScenifyIcon className="h-6.5" />
          </Link>

          {session?.user ? (
            <Link href="/home">
              <Button className={"rounded-full font-semibold"}>Go to app</Button>
            </Link>
          ) : (
            <div className="flex gap-2 items-center">
              <Link href="/">
                <Button className={cn(buttonVariants({}), "rounded-full font-semibold")}>
                  {t("common.login")}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.header>

      <PricingModal />
    </>
  );
}
