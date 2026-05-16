"use client";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import { useScriptStore } from "@/stores/script-store";
import { useMemo, useState, useEffect } from "react";
import { formatTime } from "@/utils/date";
import { estimateAudioDuration } from "@/utils/tts";
import { Icons } from "@/components/shared/icons";

interface ScriptEditingProps {
  showVisuals?: boolean;
  collapsible?: boolean;
  onBlockFocus?: (id: string) => void;
  selectedBlockId?: string | null;
  title?: string;
}

export function ScriptEditing({ title = "Edit Your Script" }: ScriptEditingProps) {
  const t = useTranslations();
  const { script, setScript } = useScriptStore();
  const [localScript, setLocalScript] = useState<string>(script);

  // Sync local state when global state changes
  useEffect(() => {
    setLocalScript(script);
  }, [script]);

  // Debounce global state update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localScript !== script) {
        setScript(localScript);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localScript, script, setScript]);

  const estimatedDuration = useMemo(() => {
    if (!localScript) return null;
    return formatTime(estimateAudioDuration(localScript), false, "short");
  }, [localScript]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center px-6 py-5 justify-between shrink-0 border-b border-border/50 bg-muted/2">
        <div className="text-sm font-bold tracking-tight text-foreground">{title}</div>
        {estimatedDuration && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/40 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
            <Icons.timer className="h-3 w-3" />
            <span>{estimatedDuration}</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        <div className="space-y-4 pb-6 pt-2">
          <div className="flex flex-col space-y-2.5">
            <div className="space-y-1 px-1">
              <Label htmlFor="full-script" className="text-sm font-medium text-foreground">
                Customize Your Script
              </Label>
              <div className="text-xs text-muted-foreground">Enter your script here...</div>
            </div>
            <AutosizeTextarea
              id="full-script"
              placeholder="Enter your script here..."
              value={localScript}
              onChange={(e) => setLocalScript(e.target.value)}
              minHeight={200}
              className="py-4 px-4 text-sm leading-relaxed w-full wrap-break-word"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
