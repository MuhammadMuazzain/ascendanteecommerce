"use client";

import { useCallback, useState } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NONE_PRESET } from "../editor/constant/caption";
import {
  CAPTION_PRESET_TIKTOK_MEDIUM_ID,
  deleteCustomCaptionPreset,
  getCaptionPresetLabel,
  resolveCaptionPresetById,
  saveCustomCaptionPreset,
} from "@/lib/caption-presets";
import { useCaptionPresetsList } from "@/lib/use-caption-presets";
import { CaptionPresetPreview } from "./caption-preset-preview";
import { nanoid } from "nanoid";
import { toast } from "sonner";

interface Caption {
  id: string;
  name: string;
  position: "top" | "middle" | "bottom";
  size: "small" | "medium" | "large";
}

interface CaptionsConfigProps {
  caption: Caption;
  onCaptionChange: (caption: Caption) => void;
}

export function CaptionsConfig({ caption, onCaptionChange }: CaptionsConfigProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { presets: presetList, reloadPresets } = useCaptionPresetsList();
  const [customName, setCustomName] = useState("");
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  const handleCaptionIdChange = useCallback(
    (captionId: string) => {
      setIsPopoverOpen(false);
      const selectedCaptionObj = resolveCaptionPresetById(captionId);
      if (selectedCaptionObj) {
        onCaptionChange({
          ...caption,
          id: captionId,
          name: getCaptionPresetLabel(selectedCaptionObj),
        });
      }
    },
    [caption, onCaptionChange],
  );

  const handlePositionChange = useCallback(
    (position: "top" | "middle" | "bottom") => {
      if (position === caption.position) return;
      onCaptionChange({ ...caption, position });
    },
    [caption, onCaptionChange],
  );

  const handleSizeChange = useCallback(
    (size: "small" | "medium" | "large") => {
      if (size === caption.size) return;
      onCaptionChange({ ...caption, size });
    },
    [caption, onCaptionChange],
  );

  const handleSaveCustom = useCallback(() => {
    const source = resolveCaptionPresetById(caption.id);
    if (!source) {
      toast.error("Select a caption style first");
      return;
    }
    const label = customName.trim() || getCaptionPresetLabel(source);
    const id = `caption-custom-${nanoid(8)}`;
    const { previewUrl, previewUrlDynamic, previewUrlStatic, ...style } = source;
    void previewUrl;
    void previewUrlDynamic;
    void previewUrlStatic;

    saveCustomCaptionPreset({
      ...style,
      id,
      label,
    });
    reloadPresets();
    onCaptionChange({ ...caption, id, name: label });
    setCustomName("");
    setIsSavingCustom(false);
    toast.success("Caption style saved");
  }, [caption, customName, onCaptionChange, reloadPresets]);

  const handleDeleteCustom = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteCustomCaptionPreset(id);
      reloadPresets();
      if (caption.id === id) {
        onCaptionChange({
          ...caption,
          id: CAPTION_PRESET_TIKTOK_MEDIUM_ID,
          name: "TikTok Text Medium",
        });
      }
      toast.success("Custom style removed");
    },
    [caption, onCaptionChange, reloadPresets],
  );

  const selectedCaptionObj = resolveCaptionPresetById(caption.id) || NONE_PRESET;

  return (
    <div className="items-center justify-between space-y-6 px-6 py-6 font-medium">
      <div className="flex items-center">Captions</div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-center gap-4 border-b border-zinc-800/50 pb-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Position</div>
            <div className="text-xs text-muted-foreground">
              Choose where the captions should appear on the screen
            </div>
          </div>
          <Select
            value={caption.position}
            onValueChange={(value: "top" | "middle" | "bottom") => handlePositionChange(value)}
          >
            <SelectTrigger className="h-9 w-full rounded-md border-border bg-background shadow-none transition-colors hover:bg-muted/50">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="rounded-md border-border bg-popover">
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 border-b border-border/50 pb-6 md:grid-cols-[1fr_240px]">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Size</div>
            <div className="text-xs text-muted-foreground">
              Adjust the visibility and impact of your captions
            </div>
          </div>
          <Select
            value={caption.size}
            onValueChange={(value: "small" | "medium" | "large") => handleSizeChange(value)}
          >
            <SelectTrigger className="h-9 w-full rounded-md border-border bg-background shadow-none transition-colors hover:bg-muted/50">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="rounded-md border-border bg-popover">
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 items-center gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Style</div>
            <div className="text-xs text-muted-foreground">
              Select a visual theme or save your own for reuse
            </div>
          </div>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="group h-9 w-full justify-between rounded-md border-border bg-background text-sm shadow-none transition-all hover:bg-muted/50"
              >
                <span className="truncate font-bold text-foreground">
                  {selectedCaptionObj && selectedCaptionObj.id !== "caption-none"
                    ? getCaptionPresetLabel(selectedCaptionObj)
                    : "Select style"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[320px] border-border bg-popover p-0 shadow-2xl"
              align="end"
            >
              <div className="border-b border-border bg-muted/50 p-3">
                <div className="text-xs font-medium text-foreground">Caption styles</div>
              </div>
              <ScrollArea className="h-[360px]">
                <div className="grid grid-cols-2 gap-2 p-3">
                  {presetList.map((captionPreset) => (
                    <div
                      key={captionPreset.id}
                      onClick={() => handleCaptionIdChange(captionPreset.id)}
                      className={cn(
                        "group relative aspect-video cursor-pointer overflow-hidden rounded-md border transition-all",
                        caption.id === captionPreset.id
                          ? "border-primary shadow-sm ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      <CaptionPresetPreview preset={captionPreset} />
                      {captionPreset.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustom(captionPreset.id, e)}
                          className="absolute left-1 top-1 rounded-sm bg-black/70 p-1 text-white hover:bg-destructive/90"
                          title="Delete saved style"
                          aria-label="Delete saved style"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      {caption.id === captionPreset.id && (
                        <div className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground shadow-sm">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="space-y-2 border-t border-border p-3">
                {isSavingCustom ? (
                  <>
                    <Input
                      placeholder="My caption style"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        onClick={handleSaveCustom}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setIsSavingCustom(false);
                          setCustomName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => setIsSavingCustom(true)}
                  >
                    Save current style
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

