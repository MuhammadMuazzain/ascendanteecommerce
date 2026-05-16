"use client";

import { Check, Loader2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAvatarStore, type GeneratedAvatar } from "@/stores/avatar-store";
import { useState, useEffect } from "react";
import { AvatarGenerationModal } from "./avatar-generation-modal";
import { toast } from "sonner";

interface AvatarConfigProps {
  selectedAvatar?: {
    id: string;
    name: string;
    url: string;
  };
  onAvatarChange: (avatar?: { id: string; name: string; url: string }) => void;
  aspectRatio: string;
}

export function AvatarConfig({ selectedAvatar, onAvatarChange, aspectRatio }: AvatarConfigProps) {
  const { generatedAvatars, isGenerating, fetchAvatars, deleteAvatar } = useAvatarStore();
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleSelect = (avatar: GeneratedAvatar) => {
    onAvatarChange({
      id: avatar.id,
      name: `Avatar ${avatar.id.slice(0, 4)}`,
      url: avatar.url,
    });
  };

  const handleDelete = async (avatar: GeneratedAvatar) => {
    setDeletingId(avatar.id);
    try {
      const ok = await deleteAvatar(avatar.id);
      if (!ok) {
        toast.error("Failed to delete avatar");
        return;
      }
      if (selectedAvatar?.id === avatar.id) {
        onAvatarChange(undefined);
      }
      toast.success("Avatar deleted");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold">Avatar</h3>
          <p className="text-xs text-muted-foreground">Select an avatar for your video.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerationModalOpen(true)}
            className="h-8 gap-1.5 border-border bg-background text-[11px] font-bold hover:bg-muted"
          >
            <Wand2 className="h-3 w-3" />
            Create
          </Button>
        </div>
      </div>

      <ScrollArea className="h-50">
        {isGenerating ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 pr-4">
            {generatedAvatars.map((avatar: GeneratedAvatar) => {
              const isSelected = selectedAvatar?.id === avatar.id;
              const isDeleting = deletingId === avatar.id;

              return (
                <div
                  key={avatar.id}
                  className={cn(
                    "group relative flex flex-col gap-2 rounded-lg border p-2 transition-all duration-200",
                    isSelected
                      ? "border-primary bg-secondary/40 ring-1 ring-primary"
                      : "border-border bg-background hover:border-border-muted hover:bg-muted/50",
                  )}
                >
                  <div className="relative aspect-3/4 max-h-32 overflow-hidden rounded-md border border-border/50 bg-muted/20">
                    <img
                      src={avatar.url}
                      alt={`Avatar ${avatar.id}`}
                      className="h-full w-full object-contain"
                    />

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleSelect(avatar)}
                      className={cn(
                        "absolute left-1 top-1 rounded-sm p-1 text-white transition-colors",
                        isSelected
                          ? "bg-primary hover:bg-primary/90"
                          : "bg-black/70 hover:bg-primary/80",
                      )}
                      title="Select avatar"
                      aria-label={`Select avatar ${avatar.id.slice(0, 4)}`}
                    >
                      <Check className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(avatar)}
                      className="absolute right-1 top-1 rounded-sm bg-black/70 p-1 text-white hover:bg-destructive/90 disabled:opacity-50"
                      title="Delete avatar"
                      aria-label={`Delete avatar ${avatar.id.slice(0, 4)}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="px-1 py-0.5">
                    <span className="block w-full truncate text-left text-[11px] font-medium">
                      Avatar {avatar.id.slice(0, 4)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <AvatarGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onSelect={(avatar) => onAvatarChange(avatar)}
        aspectRatio={aspectRatio}
      />
    </div>
  );
}
