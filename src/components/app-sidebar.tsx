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
import { Icons } from "./shared/icons";
import { Button } from "./ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRenderStore } from "@/stores/render-store";
import { useVideoGenerationStore } from "@/stores/video-generation-store";
import { useFolders } from "@/hooks/use-folders";
import { CreateProjectModal } from "./create-project-modal";
import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";

export function AppSidebar() {
  const { toggleSidebar, open, openMobile, isMobile, setOpenMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const renders = useRenderStore((state) => state.renders);
  const generationJobs = useVideoGenerationStore((state) => state.jobs);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: folders = [], isLoading: isLoadingFolders } = useFolders();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Subscription data
  const { planName, credits: totalCredits = 0, limit = 400, planId } = useSubscription();

  // Calculate percentage available
  const percentAvailable = limit > 0 ? Math.min(100, Math.max(0, (totalCredits / limit) * 100)) : 0;
  const radius = 5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentAvailable / 100) * circumference;
  const usedCredits = Math.max(0, limit - totalCredits);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  // On mobile, show labels when mobile sheet is open. On desktop, show when sidebar is open.
  const shouldShowLabels = isMobile ? openMobile : open;

  // Handler to close sidebar on mobile when clicking menu items
  const handleMobileClose = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Combine renders and generation jobs, sort by creation time (newest first), limit to 5
  const allNotifications = useMemo(() => {
    const notifications = [
      ...renders.map((render) => ({
        id: render.id,
        type: "render" as const,
        progress: render.progress,
        message: render.message,
        status: render.status,
        createdAt: render.createdAt,
        publicUrl: render.publicUrl,
      })),
      ...generationJobs.map((job) => ({
        id: job.id,
        type: "generation" as const,
        progress: job.progress,
        message: job.message,
        status: job.status,
        createdAt: job.createdAt,
        sceneUrl: job.sceneUrl,
      })),
    ];

    return notifications.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [renders, generationJobs]);

  // Count running tasks (generating or processing)
  const runningTasksCount = useMemo(() => {
    const runningRenders = renders.filter((render) => render.status === "processing").length;
    const runningGenerations = generationJobs.filter((job) => job.status === "generating").length;
    return runningRenders + runningGenerations;
  }, [renders, generationJobs]);

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
    <>
      <Sidebar collapsible="icon">
        <SidebarContent className={cn("px-1", shouldShowLabels && "bg-card")}>
          <SidebarGroup className="h-full justify-between">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <div className="flex items-center justify-between h-10">
                  {shouldShowLabels && (
                    <div className="ml-2">
                      <Link
                        href="/home"
                        onClick={handleMobileClose}
                        className="flex items-center gap-2"
                      >
                        <div className="relative w-6 h-6 overflow-hidden rounded-md border border-border">
                          <Image src="/logo.webp" alt="Logo" fill className="object-cover" />
                        </div>
                        <span className="font-semibold text-sm tracking-tight text-foreground truncate">
                          Ascendant Ecommerce
                        </span>
                      </Link>
                    </div>
                  )}
                  <Button size={"icon"} variant={"ghost"} className="flex" onClick={toggleSidebar}>
                    <Icons.menu className="size-5" />
                  </Button>
                </div>
                <SidebarMenuItem key="home">
                  {withTooltip(
                    <SidebarMenuButton className={menuButtonClasses} asChild>
                      <Link href="/home" onClick={handleMobileClose}>
                        <Icons.home className="size-10" />
                        {shouldShowLabels && <span>Home</span>}
                      </Link>
                    </SidebarMenuButton>,
                    "Home",
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem key="projects">
                  {withTooltip(
                    <SidebarMenuButton className={menuButtonClasses} asChild>
                      <Link href="/projects" onClick={handleMobileClose}>
                        <Icons.folder className="size-10" />
                        {shouldShowLabels && <span>Projects</span>}
                      </Link>
                    </SidebarMenuButton>,
                    "Projects",
                  )}
                </SidebarMenuItem>
                {!isLoadingFolders &&
                  folders.map((folder) => (
                    <SidebarMenuItem key={folder.id}>
                      {withTooltip(
                        <SidebarMenuButton className={menuButtonClasses} asChild>
                          <Link href={`/f/${folder.id}`} onClick={handleMobileClose}>
                            <Icons.folder className="size-10" />
                            {shouldShowLabels && <span>{folder.name}</span>}
                          </Link>
                        </SidebarMenuButton>,
                        folder.name,
                      )}
                    </SidebarMenuItem>
                  ))}
                <SidebarMenuItem key="create-project">
                  {withTooltip(
                    <SidebarMenuButton
                      className={cn(menuButtonClasses)}
                      onClick={() => {
                        setIsCreateModalOpen(true);
                        handleMobileClose();
                      }}
                    >
                      <Icons.plus className="size-10 text-inherit!" />
                      {shouldShowLabels && <span className="text-zinc-200">Create new</span>}
                    </SidebarMenuButton>,
                    "Create project",
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
            <SidebarGroupContent className="pb-2">
              <SidebarMenu className="space-y-2">
                <SidebarMenuItem key="notifications">
                  <Popover>
                    <PopoverTrigger asChild>
                      <SidebarMenuButton
                        className={menuButtonClasses}
                        tooltip={!shouldShowLabels ? "Notifications" : undefined}
                      >
                        {runningTasksCount > 0 ? (
                          <div className="flex flex-none size-6 items-center justify-center rounded-full border border-primary/50 bg-zinc-950 text-sm">
                            {runningTasksCount}
                          </div>
                        ) : (
                          <Icons.bell className="size-10" />
                        )}
                        {shouldShowLabels && <span>Notifications</span>}
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-4">
                      <div>
                        <p className="text-sm font-semibold">Notifications</p>
                      </div>
                      {allNotifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No notifications yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {allNotifications.map((notification) => (
                            <div
                              key={`${notification.type}-${notification.id}`}
                              className="rounded-md border border-border p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {notification.type === "generation"
                                    ? "Video Generation"
                                    : "Video Render"}
                                </span>
                                <span>
                                  {notification.status === "complete"
                                    ? "Ready"
                                    : `${Math.round(notification.progress)}%`}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {notification.message}
                              </p>
                              <div className="h-1.5 w-full rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full bg-white transition-all",
                                    notification.status === "error" && "bg-destructive",
                                  )}
                                  style={{ width: `${notification.progress}%` }}
                                />
                              </div>
                              {notification.status === "complete" && (
                                <div className="flex gap-2">
                                  {notification.type === "render" && notification.publicUrl && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="flex-1"
                                      asChild
                                    >
                                      <a
                                        href={notification.publicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Download
                                      </a>
                                    </Button>
                                  )}
                                  {notification.type === "generation" && notification.sceneUrl && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="flex-1"
                                      asChild
                                    >
                                      <Link
                                        href={notification.sceneUrl}
                                        onClick={handleMobileClose}
                                      >
                                        Open Project
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              )}
                              {notification.status === "error" && (
                                <p className="text-xs text-destructive">{notification.message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
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
                            {session?.user?.name || "User"}
                          </span>
                          <span className="truncate text-xs">{session?.user?.email}</span>
                        </div>
                        <ChevronRight className="ml-auto size-4" />
                      </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 rounded-lg p-2"
                      side={isMobile ? "bottom" : "right"}
                      align="end"
                      sideOffset={4}
                    >
                      {/* Balance Card */}
                      <div className="rounded-lg bg-secondary p-3 mb-2 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Balance</span>
                          </div>
                          {planId === "free" && (
                            <Link href="/billing" onClick={handleMobileClose}>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-[10px] px-2 bg-white text-zinc-950 hover:bg-white/90"
                              >
                                Upgrade
                              </Button>
                            </Link>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Total</span>
                            <span className="text-zinc-200">
                              {totalCredits.toLocaleString()} credits
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Used</span>
                            <span className="text-zinc-200">{usedCredits.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Link href="/account" onClick={handleMobileClose}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 h-8 text-sm font-normal"
                          >
                            Settings
                          </Button>
                        </Link>
                        <Link href="/billing" onClick={handleMobileClose}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 h-8 text-sm font-normal"
                          >
                            Subscription
                          </Button>
                        </Link>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-2 h-8 text-sm font-normal"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          >
                            <span>Theme</span>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              {theme === "dark" ? (
                                <Moon className="size-3.5" />
                              ) : (
                                <Sun className="size-3.5" />
                              )}
                              <ChevronRight className="size-3.5 opacity-50" />
                            </div>
                          </Button>
                        </div>
                      </div>

                      <div className="h-px bg-border/50 my-2" />

                      <div className="space-y-1">
                        <Link href="https://discord.gg/Tw6GnPqKJ4" onClick={handleMobileClose}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 h-8 text-sm font-normal"
                          >
                            Join our Discord
                          </Button>
                        </Link>
                        <Link href="#" onClick={handleMobileClose}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 h-8 text-sm font-normal"
                          >
                            Become an affiliate
                          </Button>
                        </Link>
                        <Link href="#" onClick={handleMobileClose}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-2 h-8 text-sm font-normal"
                          >
                            Usage analytics
                          </Button>
                        </Link>
                      </div>

                      <div className="h-px bg-border/50 my-2" />

                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start px-2 h-8 text-sm font-normal"
                          onClick={handleSignOut}
                        >
                          <LogOut className="size-3.5 mr-2" />
                          Sign out
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <CreateProjectModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </>
  );
}
