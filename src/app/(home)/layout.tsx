"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useGenerationPoller } from "@/hooks/use-generation-poller";

const Layout = ({ children }: { children: React.ReactNode }) => {
  useGenerationPoller();

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <main className="w-full h-screen bg-background flex relative">{children}</main>
    </SidebarProvider>
  );
};

export default Layout;
