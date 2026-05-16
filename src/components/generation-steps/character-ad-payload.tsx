"use client";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { Icons } from "@/components/shared/icons";

import { UserScriptBlock } from "@/types/segment";

interface CharacterAdPayloadProps {
  blocks: UserScriptBlock[];
  onChange: (value: UserScriptBlock[]) => void;
  title?: string;
}

const DEFAULT_BLOCKS: UserScriptBlock[] = [
  {
    characterName: "The Skeptic",
    characterRole: "villain",
    characterDescription: "Anthropomorphic wolf in a business suit, skeptical expression",
    sceneDescription: "Dark office setup, shadowy lighting",
    videoDescription: "Character looks directly at camera, skeptical",
    voiceDescription: "deep, gravelly, cynical",
    emotion: "skeptical",
    dialogue: "You really think this product will work? I've seen it all before.",
  },
];

export function CharacterAdPayload({
  blocks,
  onChange,
  title = "Direct Payload (JSON)",
}: CharacterAdPayloadProps) {
  const [localPayload, setLocalPayload] = useState<string>(
    blocks?.length > 0
      ? JSON.stringify({ blocks }, null, 2)
      : JSON.stringify({ blocks: DEFAULT_BLOCKS }, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  // Update internal string when blocks prop changes externally
  useEffect(() => {
    try {
      const currentBlocks = JSON.parse(localPayload).blocks;
      if (JSON.stringify(currentBlocks) !== JSON.stringify(blocks)) {
        setLocalPayload(JSON.stringify({ blocks }, null, 2));
      }
    } catch (e) {
      // If current payload is invalid, sync with blocks
      setLocalPayload(JSON.stringify({ blocks }, null, 2));
    }
  }, [blocks]);

  const handleChange = (val: string) => {
    setLocalPayload(val);
    try {
      const parsed = JSON.parse(val);
      if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
        throw new Error("Payload must contain a 'blocks' array");
      }
      setError(null);
      onChange(parsed.blocks);
    } catch (e: any) {
      setError(e.message || "Invalid JSON format");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center px-6 py-5 justify-between shrink-0 border-b border-border/50 bg-muted/2">
        <div className="text-sm font-bold tracking-tight text-foreground">{title}</div>
        {error ? (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider border border-destructive/20">
            <Icons.xCircle className="h-3 w-3" />
            <span>Invalid JSON</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
            <Icons.checkCircle className="h-3 w-3" />
            <span>Valid JSON</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        <div className="space-y-4 pb-6 pt-2">
          <div className="flex flex-col space-y-2.5">
            <div className="space-y-1 px-1">
              <Label htmlFor="char-ad-payload" className="text-sm font-medium text-foreground">
                Structured Scene Data
              </Label>
              <div className="text-xs text-muted-foreground">
                Define your characters and scenes directly.
              </div>
            </div>
            <AutosizeTextarea
              id="char-ad-payload"
              placeholder="Paste your JSON payload here..."
              value={localPayload}
              onChange={(e) => handleChange(e.target.value)}
              minHeight={300}
              className={`py-4 px-4 text-xs font-mono leading-relaxed w-full wrap-break-word ${error ? "border-destructive" : ""}`}
            />
            {error && <p className="text-[10px] text-destructive px-1">{error}</p>}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
