"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Icons } from "./shared/icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import GoogleIcon from "./logos/google";
import { authClient } from "@/lib/auth-client";
import { useModalStore } from "@/stores/use-modal-store";
import PricingModal from "./pricing-modal";
import { useSubscription } from "@/hooks/use-subscription";
import { DeleteAccountModal } from "./delete-account-modal";
import { DeleteDataModal } from "./delete-data-modal";
import { toast } from "sonner";

interface SettingRowProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const SettingRow = ({ title, description, action, icon }: SettingRowProps) => (
  <div className="flex items-center justify-between py-3">
    <div className={icon ? "flex items-start gap-3" : ""}>
      {icon && <div className="w-6 h-6 rounded flex">{icon}</div>}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
    {action}
  </div>
);

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

type ThemeOptions = "light" | "dark" | "system";

const AccountSettings = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { setModalPricing } = useModalStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteDataModalOpen, setDeleteDataModalOpen] = useState(false);
  const { planName, credits, isLoading: isSubscriptionLoading } = useSubscription();

  const [socials, setSocials] = useState({
    instagram: false,
    tiktok: false,
    youtube: false,
    google_drive: false,
  });

  useEffect(() => {
    setMounted(true);

    const validateSocial = async () => {
      try {
        const response = await fetch("/api/socials");
        if (!response.ok) throw new Error("Failed to fetch social status");
        const { socials } = await response.json();
        setSocials({
          instagram: socials.instagram,
          tiktok: socials.tiktok,
          youtube: socials.youtube,
          google_drive: socials.google_drive,
        });
      } catch (err) {
        console.error(err);
      }
    };

    validateSocial();
  }, []);

  const currentTheme = useMemo<ThemeOptions>(() => {
    if (!theme || (theme !== "light" && theme !== "dark" && theme !== "system")) {
      return "dark";
    }
    return theme;
  }, [theme]);

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  const oauthFn = useCallback(async (type: "instagram" | "tiktok" | "youtube" | "google_drive") => {
    try {
      const url =
        type === "google_drive"
          ? `/api/drive/oauth?redirectBack=${encodeURIComponent(window.location.href)}`
          : `/api/socials/${type}/oauth`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed ${type} oauth`);
      const { url: redirectUrl } = await response.json();
      window.location.href = redirectUrl;
    } catch (err) {
      console.error(err);
    }
  }, []);

  const disconnectFn = useCallback(
    async (type: "instagram" | "tiktok" | "youtube" | "google_drive") => {
      try {
        const url =
          type === "google_drive" ? `/api/drive/disconnect` : `/api/socials/${type}/disconnect`;

        const response = await fetch(url, {
          method: "PUT",
        });
        if (!response.ok) throw new Error(`Failed to disconnect ${type}`);
        const updated = await response.json();
        if (updated.success) setSocials((prev) => ({ ...prev, [type]: false }));
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const handleConnectClick = useCallback(
    (type: "instagram" | "tiktok" | "youtube" | "google_drive") => {
      if (!socials[type]) {
        oauthFn(type);
      } else {
        disconnectFn(type);
      }
    },
    [socials, oauthFn, disconnectFn],
  );

  const getButtonLabel = (type: "instagram" | "tiktok" | "youtube" | "google_drive") =>
    socials[type] ? "Disconnect" : "Connect";

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      toast.success("Account deleted successfully");
      setDeleteModalOpen(false);

      // Sign out and redirect to home
      await authClient.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please try again.");
    }
  };

  const handleDeleteData = async () => {
    try {
      const response = await fetch("/api/projects/delete-all", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete data");
      }

      toast.success("All projects and data deleted successfully");
      setDeleteDataModalOpen(false);
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Failed to delete data. Please try again.");
    }
  };

  return (
    <div className="text-foreground">
      <div className="max-w-2xl mx-auto px-4">
        {/* User Profile Section */}
        <div className="flex items-center gap-4 py-6 pt-10">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user?.image || ""} />
            <AvatarFallback className="text-xl font-semibold">{userInitial}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-bold">{userName}</h1>
            <p className="text-muted-foreground text-sm">{userEmail}</p>
          </div>
        </div>

        <Separator className="bg-white/20" />

        {/* My Plan Section */}
        <Section title="My Plan">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {isSubscriptionLoading ? (
                  <span className="animate-pulse bg-muted h-5 w-24 block rounded" />
                ) : (
                  planName
                )}
              </p>
            </div>
            {(credits || 0) > 0 ? (
              <Button
                variant="outline"
                className="rounded-full w-[110px] h-11 font-medium text-sm"
                onClick={() => router.push("/billing")}
              >
                Manage
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-full w-[110px] h-11 font-medium text-sm"
                onClick={() => setModalPricing(true)}
              >
                Upgrade
              </Button>
            )}
          </div>
        </Section>

        {/* Login Section */}
        <Section title="Login">
          <SettingRow
            title="Password"
            description="Reset your password"
            action={
              <Button
                variant="outline"
                className=" h-11 w-[100px] rounded-full font-medium text-sm"
              >
                Reset
              </Button>
            }
          />

          <SettingRow
            title="Apple"
            description="Not yet connected"
            icon={<Icons.apple className="size-5 w-full h-full" />}
            action={
              <Button variant="outline" className="h-11 w-[100px] rounded-full font-medium text-sm">
                Connect
              </Button>
            }
          />

          <SettingRow
            title="Google"
            description={userEmail}
            icon={<GoogleIcon className="size-5" />}
            action={
              <Button className="text-red-custom h-11 w-[100px] rounded-full border border-[#FF2D5533] bg-[#FF383C24]! backdrop-blur-[110px] text-sm font-medium">
                Remove
              </Button>
            }
          />
        </Section>

        {/* Support Section */}
        <Section title="Support">
          <SettingRow
            title="Frequently asked questions"
            description="Need help? Start here"
            action={
              <Button variant="outline" className="h-11 w-[100px] rounded-full font-medium text-sm">
                Open
              </Button>
            }
          />

          <SettingRow
            title="Contact support"
            description="Get in touch with the Reve team"
            action={
              <Button variant="outline" className="h-11 w-[100px] rounded-full font-medium text-sm">
                Contact
              </Button>
            }
          />
        </Section>

        {/* Integrations Section */}
        <Section title="Integrations">
          <SettingRow
            title="Google Drive"
            description="Export videos directly to Google Drive folders"
            icon={<GoogleIcon className="size-5 w-full h-full" />}
            action={
              <Button
                variant={socials.google_drive ? "default" : "outline"}
                className="h-11 w-[130px] rounded-full font-medium text-sm"
                onClick={() => handleConnectClick("google_drive")}
              >
                {getButtonLabel("google_drive")}
              </Button>
            }
          />

          <SettingRow
            title="TikTok"
            description="Connect TikTok to publish directly from Scenify"
            icon={<Icons.tiktok className="size-5 w-full h-full" />}
            action={
              <Button
                variant={socials.tiktok ? "default" : "outline"}
                className="h-11 w-[130px] rounded-full font-medium text-sm"
                onClick={() => handleConnectClick("tiktok")}
              >
                {getButtonLabel("tiktok")}
              </Button>
            }
          />

          <SettingRow
            title="YouTube"
            description="Connect YouTube to upload videos directly"
            icon={<Icons.youtube className="size-5 w-full h-full" />}
            action={
              <Button
                variant={socials.youtube ? "default" : "outline"}
                className="h-11 w-[130px] rounded-full font-medium text-sm"
                onClick={() => handleConnectClick("youtube")}
              >
                {getButtonLabel("youtube")}
              </Button>
            }
          />

          <SettingRow
            title="Instagram"
            description="Publish to Instagram without leaving Scenify"
            icon={<Icons.instagram className="size-5 w-full h-full" />}
            action={
              <Button
                variant={socials.instagram ? "default" : "outline"}
                className="h-11 w-[130px] rounded-full font-medium text-sm"
                onClick={() => handleConnectClick("instagram")}
              >
                {getButtonLabel("instagram")}
              </Button>
            }
          />
        </Section>

        {/* Preferences Section */}
        <Section title="Preferences">
          <SettingRow
            title="Appearance"
            description="Light and dark mode"
            action={
              mounted ? (
                <Select
                  value={currentTheme}
                  onValueChange={(value) => setTheme(value as ThemeOptions)}
                >
                  <SelectTrigger className="w-[100px] rounded-full h-11!">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="w-[100px] h-11 rounded-full bg-card/10 animate-pulse" />
              )
            }
          />

          <SettingRow
            title="Model training"
            description="Help improve Reve by opting into model training"
            action={<Switch />}
          />
        </Section>

        {/* Account Actions */}
        <div className="py-6 space-y-5">
          <button
            type="button"
            className="block transition-colors font-medium text-red-400 text-left"
            onClick={() => setDeleteDataModalOpen(true)}
          >
            Delete my data
          </button>
          <button
            type="button"
            className="block transition-colors font-medium text-red-400 text-left"
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete my account
          </button>
          <button type="button" className="block transition-colors font-medium text-left">
            Privacy policy
          </button>
          <button type="button" className="block transition-colors font-medium text-left">
            Terms of Service
          </button>
          <button type="button" className="block transition-colors font-medium text-left">
            Enable API access
          </button>
        </div>
      </div>
      <PricingModal />
      <DeleteAccountModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirmDelete={handleDeleteAccount}
      />
      <DeleteDataModal
        open={deleteDataModalOpen}
        onOpenChange={setDeleteDataModalOpen}
        onConfirmDelete={handleDeleteData}
      />
    </div>
  );
};

export default AccountSettings;
