"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Eye, RefreshCw, Wand2, Loader2, ImageIcon, Type, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/ui/video-player";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export type OutputNodeData = {
  type: "IMAGE" | "VIDEO";
  outputUrl?: string;
  status: "idle" | "processing" | "success" | "error";
  promptText?: string;
  resolution?: string;
  segmentId?: string;
  shotIndex?: number;
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (segmentId: string, shotIndexStr: string, type: "IMAGE" | "VIDEO") => void;
};

export type OutputNode = Node<OutputNodeData, "output">;

function OutputNode({ id, data, selected }: NodeProps<OutputNode>) {
  const isVideo = data.type === "VIDEO";

  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full pb-0 h-[340px] flex flex-col gap-0 rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1">
            {isVideo ? "Motion Output" : "Visual Output"}
          </CardTitle>
          <div className="flex items-center">
            {data.status === "processing" && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {data.status === "success" && <Check className="w-4 h-4 text-green-500" />}
          </div>
        </CardHeader>

        <div className="relative flex-1 w-full bg-muted/5 flex flex-col overflow-hidden">
          {/* Media Container */}
          <div className="absolute inset-0 z-0 bg-black/5">
            {data.outputUrl ? (
              isVideo ? (
                <VideoPlayer
                  src={data.outputUrl}
                  size="full"
                  objectFit="contain"
                  className="w-full h-full rounded-none absolute inset-0"
                />
              ) : (
                <img
                  src={data.outputUrl}
                  alt="Output"
                  className="w-full h-full object-contain absolute inset-0"
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground/20">
                {data.status === "processing" ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                    <span className="text-[10px] font-bold tracking-widest uppercase animate-pulse">
                      Processing...
                    </span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 opacity-20" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">
                      No Media
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Floating Overlays */}
          <div className="absolute top-3 right-3 z-10 pointer-events-none flex justify-end">
            <Button
              className={cn("h-8 w-8 rounded-md px-3 shadow-md transition-all pointer-events-auto")}
              variant="outline"
              onClick={() => {
                if (data.segmentId && data.shotIndex !== undefined) {
                  data.onGenerate?.(data.segmentId, data.shotIndex.toString(), data.type);
                }
              }}
              disabled={data.status === "processing"}
              size="icon"
            >
              {data.status === "processing" ? (
                <>
                  <Loader2 />
                </>
              ) : (
                <>
                  <RefreshCw />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Input handle — fully outside left border */}
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <ImageIcon className="w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      </Handle>

      {/* Output handle — fully outside right border */}
      <Handle
        id="result"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !border !border-border border-2! bg-card! !shadow-lg !flex !items-center !justify-center"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      </Handle>
    </div>
  );
}

export default memo(OutputNode);
