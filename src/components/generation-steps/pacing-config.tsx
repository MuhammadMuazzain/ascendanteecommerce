"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Zap, Play, Wind } from "lucide-react";

interface PacingConfigProps {
  pacing: "fast" | "regular" | "relaxed";
  onPacingChange: (pacing: "fast" | "regular" | "relaxed") => void;
}

export function PacingConfig({ pacing, onPacingChange }: PacingConfigProps) {
  const [localPacing, setLocalPacing] = useState(pacing);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLocalPacing(pacing);
  }, [pacing]);

  const handleValueChange = useCallback(
    (value: string | undefined) => {
      if (value) {
        const newPacing = value as "fast" | "regular" | "relaxed";
        setLocalPacing(newPacing);
        startTransition(() => {
          onPacingChange(newPacing);
        });
      }
    },
    [onPacingChange],
  );

  return (
    <div className="px-6 py-6 flex justify-between md:grid-cols-[1fr_240px] items-center gap-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Video Pacing</div>
        <div className="text-xs text-muted-foreground">
          Control the speed and rhythm of the video
        </div>
      </div>
      <ToggleGroup
        type="single"
        value={localPacing}
        onValueChange={handleValueChange}
        variant="outline"
        className="justify-end bg-zinc-900/50 p-1 rounded-lg border border-white/5"
      >
        <ToggleGroupItem
          value="fast"
          aria-label="Fast pacing"
          className="px-3 h-8 text-xs font-medium text-muted-foreground data-[state=on]:bg-zinc-800 data-[state=on]:text-primary border-none rounded-md transition-all gap-2"
        >
          <Zap className="size-3.5" />
          Fast
        </ToggleGroupItem>
        <ToggleGroupItem
          value="regular"
          aria-label="Regular pacing"
          className="px-3 h-8 text-xs font-medium text-muted-foreground data-[state=on]:bg-zinc-800 data-[state=on]:text-primary border-none rounded-md transition-all gap-2"
        >
          <Play className="size-3.5" />
          Regular
        </ToggleGroupItem>
        <ToggleGroupItem
          value="relaxed"
          aria-label="Relaxed pacing"
          className="px-3 h-8 text-xs font-medium text-muted-foreground data-[state=on]:bg-zinc-800 data-[state=on]:text-primary border-none rounded-md transition-all gap-2"
        >
          <Wind className="size-3.5" />
          Relaxed
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
