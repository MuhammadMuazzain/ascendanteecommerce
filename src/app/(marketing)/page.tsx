"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import GoogleIcon from "@/components/logos/google";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isLoadingGoogle, setIsLoadingGoogle] = React.useState<boolean>(false);

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/home");
    }
  }, [session, isPending, router]);

  const signInWithGoogle = async () => {
    try {
      setIsLoadingGoogle(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  if (isPending) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-background p-6 font-sans relative overflow-hidden">
      {/* Top Left Logo (Branding as-is) */}
      <div className="absolute top-10 left-10">
        <div className="relative w-8 h-8 overflow-hidden rounded-md border border-border">
          <Image src="/logo.webp" alt="Logo" fill className="object-cover" />
        </div>
      </div>

      {/* Main Centered Content (Cardless Auth) */}
      <div className="flex flex-col items-center text-center max-w-sm w-full px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
            Log in or sign up
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-70">
            Continue with Google to access your dashboard and manage your ecommerce insights.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={isLoadingGoogle}
          onClick={signInWithGoogle}
          className="w-full h-11 rounded-full border-border bg-transparent hover:bg-muted font-medium text-sm transition-all duration-300"
        >
          {isLoadingGoogle ? (
            <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="mr-3 h-5 w-5" />
          )}
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
