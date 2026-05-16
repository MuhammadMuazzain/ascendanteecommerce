"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  LogOut,
  Shield,
  LayoutDashboard,
  Users,
  Video,
  LineChart,
  CreditCard,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Generations",
    href: "/admin/generations",
    icon: Video,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: LineChart,
  },
];

export function AdminSidebar() {
  const { toggleSidebar, open, openMobile, isMobile, setOpenMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  const shouldShowLabels = isMobile ? openMobile : open;

  const handleMobileClose = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const menuButtonClasses =
    "[&>svg]:size-5 h-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!min-h-10 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!items-center group-data-[collapsible=icon]:!justify-center";

  const withTooltip = (node: React.ReactNode, label: string) => {
    if (shouldShowLabels) return node;
    return (
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className={cn("px-1", shouldShowLabels && "bg-card")}>
        <SidebarGroup className="h-full justify-between">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <div className="flex items-center justify-between h-10">
                {shouldShowLabels && (
                  <div className="ml-2">
                    <Link
                      href="/admin"
                      onClick={handleMobileClose}
                      className="flex items-center gap-2"
                    >
                      <div className="relative w-6 h-6 overflow-hidden rounded-md border border-border">
                        <Image src="/logo.webp" alt="Logo" fill className="object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm tracking-tight text-foreground truncate leading-none">
                          Ascendant Ecommerce
                        </span>
                      </div>
                    </Link>
                  </div>
                )}
                <Button size={"icon"} variant={"ghost"} className="flex" onClick={toggleSidebar}>
                  <Icons.menu className="size-5" />
                </Button>
              </div>

              {/* Nav items */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <SidebarMenuItem key={item.href}>
                    {withTooltip(
                      <SidebarMenuButton className={menuButtonClasses} isActive={active} asChild>
                        <Link href={item.href} onClick={handleMobileClose}>
                          <Icon strokeWidth={1.5} className="size-10" />
                          {shouldShowLabels && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>,
                      item.label,
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>

          {/* Bottom section */}
          <SidebarGroupContent className="pb-2">
            <SidebarMenu className="gap-1">
              {/* Admin Mode - Notification style */}
              <SidebarMenuItem key="admin-mode">
                {withTooltip(
                  <SidebarMenuButton className={menuButtonClasses}>
                    <Shield className="size-10 text-amber-500" />
                    {shouldShowLabels && <span className="text-amber-500">Admin Mode</span>}
                  </SidebarMenuButton>,
                  "Admin Mode",
                )}
              </SidebarMenuItem>

              {/* Back to app */}
              <SidebarMenuItem key="back-to-app">
                {withTooltip(
                  <SidebarMenuButton className={menuButtonClasses} asChild>
                    <Link href="/home" onClick={handleMobileClose}>
                      <Icons.home strokeWidth={1.5} className="size-10" />
                      {shouldShowLabels && <span>Back to App</span>}
                    </Link>
                  </SidebarMenuButton>,
                  "Back to App",
                )}
              </SidebarMenuItem>

              {/* User menu */}
              <SidebarMenuItem key="user">
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      tooltip={!shouldShowLabels ? session?.user?.name || "Profile" : undefined}
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={session?.user?.image || ""}
                          alt={session?.user?.name || ""}
                        />
                        <AvatarFallback className="rounded-lg">
                          {session?.user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {session?.user?.name || "Admin"}
                        </span>
                        <span className="truncate text-xs">{session?.user?.email}</span>
                      </div>
                      <ChevronRight className="ml-auto size-4" />
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 rounded-lg p-2"
                    side={isMobile ? "bottom" : "right"}
                    align="end"
                    sideOffset={4}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start px-2 h-8 text-sm font-normal"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-3.5 mr-2" />
                      Sign out
                    </Button>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
