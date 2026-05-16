"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Layers, CheckCircle2, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type SegmentOutputNodeData = {
  label: string;
  shotCount?: number;
  hasAudio?: boolean;
};

export type SegmentOutputNode = Node<SegmentOutputNodeData, "segmentOutput">;

function SegmentOutputNode({ id, data, selected }: NodeProps<SegmentOutputNode>) {
  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1 py-3">Scene Collector</CardTitle>
        </CardHeader>

        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center justify-center gap-6 w-full">
            <div className="relative aspect-[9/16] w-32 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-3 overflow-hidden group/placeholder transition-colors hover:bg-muted/30">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
              <Clapperboard className="w-8 h-8 text-muted-foreground/30 transition-transform group-hover/placeholder:scale-110" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                  Scene
                </span>
                <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-widest">
                  9:16
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Handles */}
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Layers className="w-4 h-4 text-muted-foreground/70" />
      </Handle>

      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Clapperboard className="w-4 h-4 text-muted-foreground/70" />
      </Handle>
    </div>
  );
}

export default memo(SegmentOutputNode);
