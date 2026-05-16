import { Geist_Mono, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ReactQueryProvider } from "@/lib/react-query";
import { PostHogProvider } from "@/lib/PostHogProvider";
import "./globals.css";
import { baseUrl, createMetadata } from "@/utils/metadata";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = createMetadata({
  title: {
    template: "%s | AE",
    default: "AE - AI Video Generator & Editor",
  },
  description:
    "Create stunning marketing videos, social media content, and more with AE. The next-generation AI video generator and editor for creators and businesses.",
  metadataBase: baseUrl,
});

import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(geistMono.variable, "font-sans", inter.variable)}
    >
      <body className={`antialiased dark`}>
        <ReactQueryProvider>
          <NextIntlClientProvider>
            <PostHogProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </PostHogProvider>
          </NextIntlClientProvider>
        </ReactQueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
