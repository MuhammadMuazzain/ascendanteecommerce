"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AspectRatio } from "@/types/video-generation";
import { RectangleVerticalIcon, RectangleHorizontalIcon, SquareIcon } from "lucide-react";

interface AspectRatioConfigProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
}

export function AspectRatioConfig({ aspectRatio, onAspectRatioChange }: AspectRatioConfigProps) {
  const [localAspectRatio, setLocalAspectRatio] = useState<AspectRatio>(aspectRatio);
  const [, startTransition] = useTransition();

  // Sync local state with prop changes (only when prop changes externally)
  useEffect(() => {
    setLocalAspectRatio(aspectRatio);
  }, [aspectRatio]);

  const handleValueChange = useCallback(
    (value: string | undefined) => {
      if (value) {
        const newRatio = value as AspectRatio;
        // Update local state immediately for instant UI feedback (synchronous, high priority)
        setLocalAspectRatio(newRatio);
        // Update parent state in a transition (non-blocking, low priority)
        startTransition(() => {
          onAspectRatioChange(newRatio);
        });
      }
    },
    [onAspectRatioChange],
  );

  return (
    <div className="px-6 py-6 flex justify-between md:grid-cols-[1fr_240px] items-center gap-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Aspect Ratio</div>
        <div className="text-xs text-muted-foreground">Choose the orientation for your video</div>
      </div>
      <ToggleGroup
        type="single"
        value={localAspectRatio}
        onValueChange={handleValueChange}
        variant="outline"
        className="justify-end gap-2"
      >
        <ToggleGroupItem
          value="9:16"
          aria-label="Toggle vertical"
          className="flex-1 max-w-16 h-9 text-muted-foreground data-[state=on]:bg-secondary/40 data-[state=on]:text-primary data-[state=on]:border-primary data-[state=on]:ring-1 data-[state=on]:ring-primary border-border bg-background shadow-none rounded-md transition-all"
        >
          <RectangleVerticalIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="16:9"
          aria-label="Toggle horizontal"
          className="flex-1 max-w-16 h-9 text-muted-foreground data-[state=on]:bg-secondary/40 data-[state=on]:text-primary data-[state=on]:border-primary data-[state=on]:ring-1 data-[state=on]:ring-primary border-border bg-background shadow-none rounded-md transition-all"
        >
          <RectangleHorizontalIcon className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="1:1"
          aria-label="Toggle square"
          className="flex-1 max-w-16 h-9 text-muted-foreground data-[state=on]:bg-secondary/40 data-[state=on]:text-primary data-[state=on]:border-primary data-[state=on]:ring-1 data-[state=on]:ring-primary border-border bg-background shadow-none rounded-md transition-all"
        >
          <SquareIcon className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
