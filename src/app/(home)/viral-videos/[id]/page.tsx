"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getGeneration } from "../actions";
import { VideoPlayer } from "@/components/ui/video-player";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Clock,
  Eye,
  Share2,
  Sparkles,
  AlertCircle,
  MoreVertical,
  Loader2,
  ExternalLink,
  Pencil,
} from "lucide-react";
import ScenifyIcon from "@/components/logos/scenify";
import type { ViralVideo } from "@/inngest/functions/kalodata-videos/utils/kalodata-agent";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { Icons } from "@/components/shared/icons";
import { analyzeViralVideo } from "../edit-actions";
import { toast } from "sonner";

export default function ViralVideosResultsPage() {
  const { id } = useParams() as { id: string };
  const [generation, setGeneration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingForVideoId, setWaitingForVideoId] = useState<string | null>(null);
  const { isMobile, toggleSidebar } = useSidebar();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await getGeneration(id);

        // Define it before checking
        const parsedResults =
          typeof data?.output === "string" ? JSON.parse(data.output) : data?.output || [];

        // Check for redirection if waiting
        if (waitingForVideoId) {
          const targetVideo = parsedResults.find((v: any) => v.id === waitingForVideoId);
          if (targetVideo && targetVideo.edit_status === "COMPLETED" && targetVideo.schema_id) {
            clearInterval(intervalId);
            window.location.href = `/edit/${targetVideo.schema_id}`;
            return;
          }
        }

        const isAnyEditingItem =
          Array.isArray(parsedResults) &&
          parsedResults.some(
            (v: any) => v.edit_status === "PENDING" || v.edit_status === "EDITING",
          );

        setGeneration(data);

        // Keep polling if generation is not completed OR if any video is being edited
        if (data?.status === "COMPLETED" || data?.status === "FAILED") {
          if (!isAnyEditingItem && !waitingForVideoId) {
            setIsLoading(false);
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Error fetching generation:", error);
        setIsLoading(false);
        clearInterval(intervalId);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [id, waitingForVideoId]);

  const ensureObject = (val: any) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  };

  const isPending =
    isLoading &&
    (!generation || generation.status === "PENDING" || generation.status === "PROGRESS");

  const isFailed = generation?.status === "FAILED";
  const results: ViralVideo[] =
    !isPending && !isFailed ? ensureObject(generation?.output) || [] : [];

  const isAnyServerEditing = results.some(
    (v) => v.edit_status === "PENDING" || v.edit_status === "EDITING",
  );
  const [isLocalEditing, setIsLocalEditing] = useState(false);

  useEffect(() => {
    if (isAnyServerEditing) {
      setIsLocalEditing(false);
    }
  }, [isAnyServerEditing]);

  const showEditingOverlay = isAnyServerEditing || isLocalEditing;

  const productLabel = generation?.input?.productUrl
    ? (() => {
        try {
          return new URL(generation.input.productUrl).searchParams.get("id") || "Product";
        } catch {
          return "Product";
        }
      })()
    : "Product";

  return (
    <main className="w-full h-screen flex-1 bg-card">
      <ScrollArea className="h-full">
        {/* Sticky Header */}
        <div className="h-14 flex items-center p-4 bg-card/80 backdrop-blur-3xl justify-between text-sm font-medium border-b sticky top-0 z-10 transition-all duration-300">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button className="rounded-full" size="icon" variant="ghost" onClick={toggleSidebar}>
                <Icons.menu className="size-5" />
              </Button>
            )}
            Viral Videos
            {!isPending && !isFailed && results.length > 0 && (
              <span className="text-muted-foreground font-normal">— {productLabel}</span>
            )}
          </div>
          {!isPending && !isFailed && results.length > 0 && (
            <span className="text-xs text-muted-foreground">{results.length} videos found</span>
          )}
        </div>

        <div className="p-8 mx-auto">
          {/* Loading skeleton */}
          {isPending && (
            <LoadingState progress={generation?.progress || 0} status={generation?.status} />
          )}

          {/* Error state */}
          {isFailed && (
            <ErrorState
              error={ensureObject(generation?.metadata)?.error || generation?.metadata?.error}
            />
          )}

          {/* Results grid */}
          {!isPending && !isFailed && results.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
              {results.map((video, index) => (
                <VideoResultCard
                  key={video.id || index}
                  video={video}
                  generationId={id}
                  onEditStart={(videoId) => {
                    setIsLocalEditing(true);
                    setWaitingForVideoId(videoId);
                  }}
                />
              ))}
            </div>
          )}

          {/* Full Screen Editing Loader */}
          {showEditingOverlay && (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
              <div className="flex flex-col items-center gap-6 max-w-sm text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Loader2 className="size-16 animate-spin text-primary relative z-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    AI Editing in Progress
                  </h2>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Our professional editor is analyzing your clips, removing clutter, and
                    identifying the perfect viral moments. This usually takes about 60 seconds.
                  </p>
                </div>
                <div className="flex gap-1">
                  <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="size-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isPending && !isFailed && results.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground mt-8 text-base space-y-2">
              <div className="py-2 text-stone-600">
                <Sparkles className="size-16" />
              </div>
              <h3 className="font-medium text-foreground">No viral videos found</h3>
              <p>We couldn&apos;t find any viral content for this product. Try another.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}

function VideoResultCard({
  video,
  generationId,
  onEditStart,
}: {
  video: ViralVideo & { schema_id?: string };
  generationId: string;
  onEditStart: (videoId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = async () => {
    setIsEditing(true);
    onEditStart(video.id);
    try {
      await analyzeViralVideo(generationId, video.id);

      toast.success("AI Analysis started. This will take about 60 seconds.");
    } catch (error) {
      console.error("Error starting edit analysis:", error);
      toast.error("Failed to start AI analysis.");
      setIsEditing(false);
      // Wait for 1s then reset overlay fallback if parent has it open but API call failed
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-card border border-border rounded-sm overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:border-primary/50 hover:shadow-md",
      )}
    >
      {/* Preview Area */}
      <div className="relative aspect-video w-full bg-muted overflow-hidden">
        {video.url ? (
          <VideoPlayer src={video.url} className="h-full w-full object-cover" size="full" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-foreground/5">
            <ScenifyIcon className="w-20 h-auto opacity-10 text-foreground" />
          </div>
        )}

        {/* Overlay metrics top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 pointer-events-none">
          {video.views && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
              <Eye className="size-2.5" />
              {video.views}
            </span>
          )}
          {video.duration && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
              <Clock className="size-2.5" />
              {video.duration}
            </span>
          )}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          {/* Revenue as title */}
          <h3 className="text-sm font-semibold text-foreground truncate">
            {video.revenue
              ? `${video.revenue} revenue`
              : video.description?.slice(0, 48) || "Viral Video"}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {video.sale && (
              <span className="flex items-center gap-1">
                <ShoppingCart className="size-3" />
                {video.sale} sales
              </span>
            )}
            {video.gpm != null && (
              <span className="flex items-center gap-1 text-green-500">
                <DollarSign className="size-3" />
                {video.gpm.toFixed(2)} GPM
              </span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {video.create_time
              ? new Date(video.create_time).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })
              : ""}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={handleEdit}
              disabled={
                isEditing || video.edit_status === "PENDING" || video.edit_status === "EDITING"
              }
            >
              {isEditing || video.edit_status === "PENDING" || video.edit_status === "EDITING" ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Pencil className="mr-2 w-4 h-4" />
              )}
              {video.analysis ? "Re-analyze Video" : "Edit Video"}
            </DropdownMenuItem>

            {video.schema_id && video.edit_status === "COMPLETED" && (
              <DropdownMenuItem onClick={() => window.open(`/edit/${video.schema_id}`, "_blank")}>
                <Sparkles className="mr-2 w-4 h-4 text-primary" />
                Open AI Edit
              </DropdownMenuItem>
            )}

            {video.url && (
              <DropdownMenuItem onClick={() => window.open(video.url, "_blank")}>
                <ExternalLink className="mr-2 w-4 h-4" />
                Open Video
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(video.url || "")}>
              <Share2 className="mr-2 w-4 h-4" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <TrendingUp className="mr-2 w-4 h-4" />
              Use as Inspiration
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function LoadingState({ progress, status }: { progress: number; status?: string }) {
  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {status === "PROGRESS" ? "Analyzing videos…" : "Starting analysis…"}
          </p>
          <p className="text-xs text-muted-foreground">
            Stagehand is navigating Kalodata. This takes 30–60 seconds.
          </p>
        </div>
        {progress > 0 && (
          <div className="w-64 space-y-1">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700 rounded-full"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
          </div>
        )}
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-sm overflow-hidden bg-card border border-border">
            <div className="aspect-video bg-muted animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground mt-8 text-base space-y-4">
      <div className="py-2 text-destructive">
        <AlertCircle className="size-16" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">Analysis failed</h3>
        <p className="max-w-sm text-sm">
          {error ||
            "An unexpected error occurred while processing the viral data. Please verify the URL and try again."}
        </p>
      </div>
      <Button variant="outline" onClick={() => (window.location.href = "/")}>
        Return to Dashboard
      </Button>
    </div>
  );
}
