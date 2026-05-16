"use client";

import { Sparkles, Scissors, X, Video, Users, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { ViralVideosDialog } from "./home/viral-videos-dialog";

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  href?: string;
  type?: string;
  badge?: string;
  isDialog?: boolean;
}

const getTools = (): ToolItem[] => [
  {
    id: "ugc-video",
    title: "UGC Video Ads",
    description: "Create authentic user-style ads with AI avatars interacting with your product.",
    icon: Video,
    href: "/script-to-video?mode=ugc-video-ad",
  },
  {
    id: "character-driven-ad",
    title: "Character-Driven Ad",
    description: "Generate multi-character ads with native lip-sync and cinematic consistency.",
    icon: Users,
    href: "/script-to-video?mode=character-driven-ad",
  },
  {
    id: "fake-ugc-video-ad",
    title: "Fake UGC Ads",
    description: "High-converting AI-generated UGC style ads using lifestyle visuals and avatars.",
    icon: Sparkles,
    href: "/script-to-video?mode=fake-ugc-video-ad",
  },
  {
    id: "product-video",
    title: "Product Video Ads",
    description: "Generate high-converting promo videos from your product assets and descriptions.",
    icon: Scissors,
    href: "/script-to-video?mode=product-video-ad",
  },
  {
    id: "product-image-ad",
    title: "Product Image Ads",
    description: "Generate dynamic, fast-pacing promo videos from your product image assets.",
    icon: ImageIcon,
    href: "/script-to-video?mode=product-image-ad",
  },
  {
    id: "clone-videos",
    title: "Clone Videos",
    description: "Finds good videos and clones it with minimal edits.",
    icon: Sparkles,
    isDialog: true,
  },
];

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<string | null>(null);
  const [isViralDialogOpen, setIsViralDialogOpen] = useState(false);

  const tools = getTools();

  const handleCreateProject = async (type: string) => {
    setIsCreating(type);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Project",
          type: type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const { project } = await response.json();
      onOpenChange(false);
      if (project.generationId) {
        router.push(`/storyboard/${project.generationId}`);
      } else {
        router.push(`/projects/${project.id}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsCreating(null);
    }
  };

  const handleToolClick = (tool: ToolItem) => {
    if (tool.isDialog) {
      onOpenChange(false);
      setTimeout(() => setIsViralDialogOpen(true), 150);
    } else if (tool.type) {
      handleCreateProject(tool.type);
    } else if (tool.href) {
      router.push(tool.href);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md bg-card/70 backdrop-blur-2xl border-white/5 rounded-2xl p-0 gap-0 overflow-hidden shadow-xl"
        >
          {/* Subtle Background Mesh */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute -top-[20%] -right-[10%] size-64 bg-primary/10 blur-[80px] rounded-full" />
            <div className="absolute -bottom-[20%] -left-[10%] size-64 bg-primary/5 blur-[80px] rounded-full" />
          </div>

          <div className="relative p-8">
            <div className="flex items-start justify-between mb-8">
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Create project
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Choose a tool to start your next creation
                </DialogDescription>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full hover:bg-foreground/5 text-muted-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-2"
            >
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className={cn(
                    "group relative flex flex-row items-center gap-4 p-4 bg-secondary/30 backdrop-blur-sm border border-white/5 rounded-xl transition-all duration-200 cursor-pointer",
                    "hover:bg-secondary/50 hover:border-white/10 shadow-sm",
                    isCreating === tool.type && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="size-10 rounded-lg bg-secondary/50 border border-white/10 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-all duration-300 shrink-0">
                    <tool.icon className="size-5" strokeWidth={1.5} />
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold text-foreground">{tool.title}</h3>
                      {tool.badge && (
                        <span className="px-2 py-0.5 text-[8px] uppercase font-bold tracking-wider bg-background/50 text-muted-foreground border border-white/5 rounded-full shrink-0">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-1">
                      {isCreating === tool.type ? "Preparing project..." : tool.description}
                    </p>
                  </div>

                  {isCreating === tool.type && (
                    <div className="absolute inset-0 bg-card/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center">
                      <Sparkles className="size-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
      <ViralVideosDialog open={isViralDialogOpen} onOpenChange={setIsViralDialogOpen} />
    </>
  );
}
