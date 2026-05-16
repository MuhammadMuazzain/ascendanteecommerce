"use client";

import React, { memo } from "react";
import { type NodeProps, type Node, Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Video } from "lucide-react";

export type SegmentGroupNodeData = {
  id: string;
  label: string;
  index: number;
};

export type SegmentGroupNode = Node<SegmentGroupNodeData, "segmentGroup">;

function SegmentGroupNode({ data, selected }: NodeProps<SegmentGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-xl  border-border border-2 transition-all duration-500 bg-card",
        selected && "border-primary/40",
      )}
    >
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !bg-background !border-2 !border-primary/50 !rounded-full flex items-center justify-center !-right-5 !top-1/2 !-translate-y-1/2 z-10 shadow-2xl hover:scale-110 transition-transform group/handle"
      >
        <Video className="w-4 h-4 text-primary pointer-events-none" />
      </Handle>

      <div className="absolute -top-12 left-0 flex items-center gap-3">
        <div className={cn("text-base px-4 font-bold")}>Segment {data.index + 1}</div>
      </div>
    </div>
  );
}

export default memo(SegmentGroupNode);
