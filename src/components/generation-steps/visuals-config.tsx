"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, Palette, FilmIcon, Wand2Icon, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VIDEO_STYLES } from "@/constants/video-styles";
import { VideoType, FrameStyle } from "@/utils/enum";

interface VisualsConfigProps {
  selectedVisualType: VideoType;
  onVisualTypeChange: (type: VideoType) => void;
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  selectedStyleId: FrameStyle;
  onStyleIdChange: (styleId: FrameStyle) => void;
  scriptTone: string;
  onScriptToneChange: (tone: string) => void;
  availableStyles: typeof VIDEO_STYLES;
  /** Product Image Ad (Type 1): still frames only — disables AI Videos / stock selection. */
  freezeVisualType?: VideoType;
}

export function VisualsConfig({
  selectedVisualType,
  onVisualTypeChange,
  selectedStyle,
  onStyleChange,
  selectedStyleId,
  onStyleIdChange,
  scriptTone,
  onScriptToneChange,
  availableStyles,
  freezeVisualType,
}: VisualsConfigProps) {
  const [localVisualType, setLocalVisualType] = useState<VideoType>(selectedVisualType);
  const [localStyleId, setLocalStyleId] = useState<FrameStyle>(
    selectedStyleId || FrameStyle.Realism,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalVisualType(selectedVisualType);
  }, [selectedVisualType]);

  useEffect(() => {
    setLocalStyleId(selectedStyleId || FrameStyle.Realism);
  }, [selectedStyleId]);

  useEffect(() => {
    if (freezeVisualType !== undefined && localVisualType !== freezeVisualType) {
      setLocalVisualType(freezeVisualType);
      onVisualTypeChange(freezeVisualType);
    }
  }, [freezeVisualType, localVisualType, onVisualTypeChange]);

  const handleVisualTypeChange = useCallback(
    (type: VideoType) => {
      // Close popover first
      setIsPopoverOpen(false);
      // Update local state immediately for instant UI feedback
      setLocalVisualType(type);
      // Update parent state
      onVisualTypeChange(type);
    },
    [onVisualTypeChange],
  );

  const handleStyleChange = useCallback(
    (style: string) => {
      const frameStyle = style === "none" ? FrameStyle.Realism : (style as FrameStyle);
      setLocalStyleId(frameStyle);

      const matched = VIDEO_STYLES.find((s) => s.id === frameStyle);
      const defaultDescription = matched?.description || "";
      const defaultTone = matched?.scriptTonePreset || "";

      onStyleIdChange(frameStyle);
      onStyleChange(defaultDescription);
      onScriptToneChange(defaultTone);
      setIsModalOpen(false);
    },
    [onStyleIdChange, onStyleChange, onScriptToneChange],
  );

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center font-medium">Visuals</div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4">
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">Visual Type</div>
          <div className="text-xs text-muted-foreground">
            {freezeVisualType !== undefined
              ? "Still images only for this workflow (no AI video clips)."
              : "Choose the type of visual you want to use"}
          </div>
        </div>
        {freezeVisualType !== undefined ? (
          <div className="flex h-9 w-full items-center rounded-md border border-border bg-muted/30 px-3 text-sm font-medium text-foreground">
            AI Images
          </div>
        ) : (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-9 bg-background border-border hover:bg-muted/50 transition-all text-sm group shadow-none rounded-md"
              >
                <span className="font-bold text-foreground">
                  {localVisualType === VideoType.AI_IMAGES
                    ? "AI Images"
                    : localVisualType === VideoType.AI_VIDEOS
                      ? "AI Videos"
                      : "Stock Videos"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-1 w-60 bg-popover border-border shadow-2xl" align="end">
              <div className="flex flex-col gap-1">
                {[
                  {
                    id: VideoType.AI_IMAGES,
                    title: "AI Images",
                    desc: "Animate AI images",
                    icon: Palette,
                  },
                  {
                    id: VideoType.AI_VIDEOS,
                    title: "AI Videos",
                    desc: "AI generated videos",
                    icon: Wand2Icon,
                  },
                  {
                    id: VideoType.STOCK_VIDEOS,
                    title: "Stock Videos",
                    desc: "Professional stock footage",
                    icon: FilmIcon,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleVisualTypeChange(item.id)}
                    className={cn(
                      "group relative flex items-center gap-3 cursor-pointer select-none rounded-md px-3 py-2.5 transition-all outline-none",
                      localVisualType === item.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground/70 hover:text-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        localVisualType === item.id
                          ? "bg-primary/20"
                          : "bg-muted group-hover:bg-accent-foreground/10",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{item.title}</span>
                      <span className="text-[10px] text-muted-foreground mt-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {/* Visual Styles */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Choose the style of visual you want to use
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Upload Option */}
          {/* <SelectableCard
            isSelected={false}
            onClick={() => { }}
            className="flex flex-col items-center justify-center p-4 rounded-xl aspect-square bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 transition-all border-dashed"
          >
            <Upload className="h-6 w-6 mb-2 text-muted-foreground" />
            <span className="text-[10px] text-center text-muted-foreground">
              Upload a style reference for better consistency!
            </span>
          </SelectableCard> */}

          {/* Style Presets */}
          {availableStyles.map((style) => (
            <div
              key={style.id}
              onClick={() => handleStyleChange(style.id)}
              className={cn(
                "relative aspect-square rounded-md overflow-hidden cursor-pointer group border transition-all",
                localStyleId === style.id
                  ? "border-primary ring-1 ring-primary shadow-sm"
                  : "border-border hover:border-muted-foreground/30",
              )}
            >
              <img
                src={style.previewUrl}
                alt={style.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Label for name */}
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-bold text-white truncate block uppercase tracking-wider">
                  {style.name}
                </span>
              </div>
              {localStyleId === style.id && (
                <div className="absolute top-1 right-1 bg-primary p-0.5 rounded-full text-primary-foreground shadow-sm">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>

        {localStyleId && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2.5">
              <div className="space-y-1 px-1">
                <div className="text-sm font-medium text-foreground">Style Description</div>
                <div className="text-xs text-muted-foreground">
                  Describe the visual style for better generation
                </div>
              </div>
              <Textarea
                value={selectedStyle}
                onChange={(e) => onStyleChange(e.target.value)}
                placeholder="Describe the visual style..."
                className="min-h-20 text-sm bg-background border-border focus-visible:ring-primary/20 transition-all resize-none rounded-md shadow-none font-medium"
              />
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1 px-1">
                <div className="text-sm font-medium text-foreground">Script Tone</div>
                <div className="text-xs text-muted-foreground">
                  Describe the narrative voice and dialogue style for the script writer
                </div>
              </div>
              <Textarea
                value={scriptTone}
                onChange={(e) => onScriptToneChange(e.target.value)}
                placeholder="e.g. Warm and playful, lean into comedic timing. Villains are lovably mischievous..."
                className="min-h-24 text-sm bg-background border-border focus-visible:ring-primary/20 transition-all resize-none rounded-md shadow-none font-medium"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
