import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: "https://scenify.io",
      images: "/banner.png",
      siteName: "Scenify: AI Video Editor",
      ...override.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@scenify",
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: "/banner.png",
      ...override.twitter,
    },
    icons: {
      icon: "/icon.svg",
      shortcut: "/icon.svg",
      apple: "/icon.svg",
    },
    applicationName: "Scenify",
    authors: [{ name: "Scenify Team", url: "https://scenify.io" }],
    keywords: [
      "AI Video Editor",
      "Video Generation",
      "Content Creation",
      "Marketing Videos",
      "Social Media Video",
      "Text to Video",
      "Video Automation",
    ],
    creator: "Scenify",
    publisher: "Scenify",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
  };
}

export const baseUrl =
  process.env.NODE_ENV === "development"
    ? new URL("http://localhost:3000")
    : new URL("https://beta.scenify.io");
