"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname && posthogClient) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthogClient.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, posthogClient]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const isDev = process.env.NODE_ENV === "development";
    // Skip init in dev by default to avoid proxy timeouts to us.i.posthog.com.
    // Set NEXT_PUBLIC_POSTHOG_ENABLED_IN_DEV=true to enable PostHog in development.
    if (!key || (isDev && process.env.NEXT_PUBLIC_POSTHOG_ENABLED_IN_DEV !== "true")) {
      return;
    }
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // Handled by PostHogPageview component
      capture_pageleave: true,
      capture_performance: true,
      autocapture: true,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
