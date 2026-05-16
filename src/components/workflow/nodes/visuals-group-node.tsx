"use client";

import React, { memo } from "react";
import { type NodeProps, type Node, Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export type VisualsGroupNodeData = {
  id: string;
  label: string;
};

export type VisualsGroupNode = Node<VisualsGroupNodeData, "visualsGroup">;

function VisualsGroupNode({ data, selected }: NodeProps<VisualsGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-xl  border-border border-2 transition-all duration-500 bg-card",
        selected && "border-primary/40",
      )}
    >
      {/* Target handle for the connection from Segment/Voice node */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !bg-background !border-2 !border-primary/50 !rounded-full flex items-center justify-center !-left-5 !top-1/2 !-translate-y-1/2 z-10 shadow-2xl hover:scale-110 transition-transform group/handle"
      >
        <Sparkles className="w-4 h-4 text-primary pointer-events-none" />
      </Handle>

      {/* Label for the sub-group */}
      <div className="absolute -top-12 left-0 flex items-center gap-3">
        <div className={cn("text-base px-4 font-bold")}> Generative Pipeline</div>
      </div>
    </div>
  );
}

export default memo(VisualsGroupNode);
