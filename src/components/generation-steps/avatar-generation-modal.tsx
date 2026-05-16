"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Wand2,
  Check,
  RefreshCw,
  Sparkles,
  User,
  Camera,
  Briefcase,
  Palette,
  UploadCloud,
} from "lucide-react";
import { useAvatarStore } from "@/stores/avatar-store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { uploadFile, UploadError } from "@/lib/upload-utils";
import { authClient } from "@/lib/auth-client";
import { Badge } from "../ui/badge";

interface AvatarGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatar: { id: string; name: string; url: string }) => void;
  aspectRatio: string;
}

const AVATAR_PRESETS = [
  {
    id: "professional",
    label: "Professional",
    icon: Briefcase,
    prompt:
      "Professional headshot, business casual attire, office background, soft studio lighting",
  },
  {
    id: "tech",
    label: "Tech Enthusiast",
    icon: Camera,
    prompt: "Casual tech setup background, ring light, modern vibe, eye-level",
  },
  {
    id: "creative",
    label: "Creative",
    icon: Palette,
    prompt: "Artistic studio background, dynamic colorful lighting, expressive style",
  },
  {
    id: "casual",
    label: "Casual/Vlog",
    icon: User,
    prompt: "Cozy home environment, natural daylight, authentic relatable look",
  },
];

function AvatarUpload({
  onSelectCustomAvatar,
}: {
  onSelectCustomAvatar: (url: string, name: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = authClient.useSession();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      toast.error("Please sign in to upload an avatar");
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadFile(file, userId);
      onSelectCustomAvatar(result.url, file.name);
      toast.success("Avatar uploaded");
    } catch (error) {
      console.error("Upload failed:", error);
      const message =
        error instanceof UploadError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to upload avatar image";
      toast.error(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 m-6 border-2 border-dashed border-border rounded-lg bg-muted/30 group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4 border border-border group-hover:border-primary transition-colors">
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          <UploadCloud className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>
      <h3 className="text-lg font-bold mb-2 text-foreground">Upload Avatar Image</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Upload your own image (PNG, JPG) to use as a personalized avatar in your video.
      </p>
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="rounded-full px-8 h-10 font-bold"
      >
        {isUploading ? "Uploading..." : "Select Image File"}
      </Button>
    </div>
  );
}

export function AvatarGenerationModal({
  isOpen,
  onClose,
  onSelect,
  aspectRatio,
}: AvatarGenerationModalProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "completed" | "failed">("idle");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const { saveAvatar } = useAvatarStore();

  const handleSelect = () => {
    if (generatedImageUrl && taskId) {
      onSelect({
        id: taskId,
        name: `Avatar ${taskId.slice(0, 4)}`,
        url: generatedImageUrl,
      });
      onClose();
      setTimeout(resetState, 300);
    }
  };

  const applyPreset = (preset: (typeof AVATAR_PRESETS)[0]) => {
    if (activePreset === preset.id) {
      setActivePreset(null);
      return;
    }
    setActivePreset(preset.id);
    const newDesc = description.trim() ? `${description.trim()}, ${preset.prompt}` : preset.prompt;
    setDescription(newDesc);
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    try {
      setIsGenerating(true);
      setStatus("generating");
      setGeneratedImageUrl(null);

      const response = await fetch("/api/avatar/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          aspectRatio: aspectRatio,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const data = await response.json();
      const generatedUrl = data.data?.url || data.url;

      if (!generatedUrl) {
        throw new Error("No URL returned from avatar generation");
      }

      setGeneratedImageUrl(generatedUrl);
      setStatus("completed");
      setIsGenerating(false);

      // Keep taskId logic for consistency in ID if it's used elsewhere
      const newTaskId = data.data?.recordId || data.recordId || "nano-banana-direct";
      setTaskId(newTaskId);

      saveAvatar({
        url: generatedUrl,
        prompt: description,
        aspectRatio: aspectRatio,
      });

      toast.success("Avatar generated successfully!");
    } catch (error) {
      console.error("Error generating avatar:", error);
      toast.error("Failed to generate avatar");
      setIsGenerating(false);
      setStatus("failed");
    }
  };

  // No polling needed for direct Nano Banana API

  const handleClose = () => {
    if (isGenerating) {
      if (confirm("Generation is still in progress. Closing this modal will not stop it. Close?")) {
        onClose();
        resetState();
      }
    } else {
      onClose();
      resetState();
    }
  };

  const resetState = () => {
    setDescription("");
    setGeneratedImageUrl(null);
    setStatus("idle");
    setTaskId(null);
    setIsGenerating(false);
    setActivePreset(null);
  };

  const getAspectClass = (ratio: string) => {
    if (ratio === "16:9") return "aspect-video w-full max-w-sm";
    if (ratio === "1:1") return "aspect-square w-48 md:w-56";
    return "aspect-9/16 w-48 md:w-56";
  };

  const handleAvatarUploadSelect = async (url: string, name: string) => {
    try {
      const saved = await saveAvatar({
        url,
        prompt: "Uploaded Avatar",
        aspectRatio,
      });
      if (!saved) {
        toast.error("Failed to save avatar to library");
        return;
      }
      onSelect({
        id: saved.id,
        name: name || `Avatar ${saved.id.slice(0, 4)}`,
        url: saved.url,
      });
      onClose();
      setTimeout(resetState, 300);
    } catch (error) {
      console.error("Error saving uploaded avatar:", error);
      toast.error("Failed to save avatar to library");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl bg-background border-border text-foreground overflow-hidden p-0 gap-0 shadow-xl rounded-xl">
        <DialogHeader className="p-6 border-b border-border bg-card">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Create AI Avatar
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            Describe your persona and let AI bring it to life.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="create" className="flex flex-col w-full">
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg border border-border">
              <TabsTrigger
                value="create"
                className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-bold h-9"
              >
                Generate with AI
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="rounded-md text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all text-sm font-bold h-9"
              >
                Upload Image
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="create" className="m-0 border-none p-0 flex-1 overflow-auto">
            <div className="flex flex-col md:flex-row h-full">
              {/* Main Input Area */}
              <div
                className={cn(
                  "flex-1 p-6 space-y-6 transition-all duration-300",
                  status === "completed" && generatedImageUrl ? "md:max-w-[50%]" : "w-full",
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                      Description
                    </label>
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 h-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider rounded-sm bg-muted border-none"
                    >
                      {aspectRatio}
                    </Badge>
                  </div>

                  <Textarea
                    placeholder="A professional woman in her 30s with glasses, soft cinematic lighting..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isGenerating}
                    className="resize-none h-40 bg-background border-border text-foreground placeholder:text-muted-foreground/40 rounded-lg shadow-none focus-visible:ring-primary/20 transition-all font-medium"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                    Quick Styles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset)}
                        disabled={isGenerating}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border transition-all duration-200",
                          activePreset === preset.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                        )}
                      >
                        <preset.icon className="w-3.5 h-3.5" />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result / Loading Area */}
              <AnimatePresence mode="wait">
                {status !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={cn(
                      "flex-1 bg-muted/20 border-l border-border flex flex-col items-center justify-center p-6 relative min-h-75",
                      status === "completed" ? "md:w-1/2" : "w-full md:w-auto",
                    )}
                  >
                    {status === "generating" && (
                      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center relative bg-background">
                            <div className="w-12 h-12 rounded-full border-t-2 border-primary animate-spin" />
                          </div>
                        </div>
                        <div className="space-y-2 relative">
                          <h4 className="font-bold text-foreground tracking-tight">
                            Crafting Identity
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-50">
                            Analyzing description and creating persona...
                          </p>
                        </div>
                      </div>
                    )}

                    {status === "completed" && generatedImageUrl && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-6 w-full"
                      >
                        <div className="relative group">
                          <div
                            className={cn(
                              "relative rounded-lg overflow-hidden border border-border shadow-xl",
                              getAspectClass(aspectRatio),
                            )}
                          >
                            <img
                              src={generatedImageUrl}
                              alt="Generated Avatar"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 right-4 bg-green-500 p-1 rounded-full text-white shadow-lg">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">
                            Avatar Ready
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {status === "failed" && (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive border border-destructive/20">
                          <RefreshCw className="w-8 h-8 opacity-50" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-destructive">Generation Failed</p>
                          <p className="text-xs text-muted-foreground">
                            Something went wrong. Let's try again.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <DialogFooter className="p-6 border-t border-border bg-card sm:justify-between flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-full text-xs font-bold tracking-tight"
              >
                Go Back
              </Button>
              <div className="flex gap-3">
                {status === "completed" && (
                  <Button
                    onClick={handleSelect}
                    className="rounded-full px-8 bg-foreground hover:bg-foreground/90 text-background font-bold text-xs h-10 transition-all active:scale-95 shadow-sm"
                  >
                    Select & Continue
                  </Button>
                )}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !description.trim()}
                  className={cn(
                    "rounded-full px-8 font-bold text-xs h-10 transition-all active:scale-95 shadow-sm",
                    status === "completed"
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground",
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : status === "completed" ? (
                    "Generate Another"
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Avatar
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value="upload"
            className="m-0 border-none p-0 flex-1 flex flex-col items-center justify-center min-h-[400px]"
          >
            <AvatarUpload onSelectCustomAvatar={handleAvatarUploadSelect} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
