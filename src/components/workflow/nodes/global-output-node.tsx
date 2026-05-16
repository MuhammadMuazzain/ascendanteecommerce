"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Film, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type GlobalOutputNodeData = {
  segmentCount?: number;
};

export type GlobalOutputNode = Node<GlobalOutputNodeData, "globalOutput">;

function GlobalOutputNode({ id, data, selected }: NodeProps<GlobalOutputNode>) {
  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1 py-3">Final Compile</CardTitle>
        </CardHeader>

        <CardContent className="p-0 flex flex-col items-center justify-center min-h-[360px] bg-muted/5">
          <div className="flex flex-col items-center justify-center gap-8 w-full p-8">
            <div className="relative aspect-[9/16] w-36 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 overflow-hidden group/placeholder transition-all hover:bg-primary/10 hover:border-primary/40 shadow-inner">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:14px_24px]" />
              <Film className="w-10 h-10 text-primary/40 transition-transform group-hover/placeholder:scale-110" />
              <div className="flex flex-col items-center gap-1.5 relative z-10">
                <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">
                  Master
                </span>
                <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest">
                  Final Render
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
        <Sparkles className="w-4 h-4 text-primary/70" />
      </Handle>
    </div>
  );
}

export default memo(GlobalOutputNode);
