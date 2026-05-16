"use client";
import AccountSettings from "@/components/account-settings";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function Page() {
  const { open, isMobile, toggleSidebar } = useSidebar();
  const router = useRouter();

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
            Account
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={async () => {
              await authClient.signOut();
              router.push("/");
            }}
          >
            Log out
          </Button>
        </div>
        <AccountSettings />
      </ScrollArea>
    </main>
  );
}
