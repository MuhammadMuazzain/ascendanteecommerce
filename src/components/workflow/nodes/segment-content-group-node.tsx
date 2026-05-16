"use client";

import React, { memo } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type SegmentContentGroupNodeData = {
  id: string;
  index: number;
};

export type SegmentContentGroupNode = Node<SegmentContentGroupNodeData, "segmentContentGroup">;

function SegmentContentGroupNode({ data, selected }: NodeProps<SegmentContentGroupNode>) {
  return (
    <div
      className={cn(
        "relative w-full h-full rounded-xl  border-border border-2 transition-all duration-500 bg-card",
        selected && "border-primary/40",
      )}
    >
      <div className="absolute -top-12 left-0 flex items-center gap-3">
        <div className={cn("text-base px-4 font-bold")}> Scene voice</div>
      </div>
    </div>
  );
}

export default memo(SegmentContentGroupNode);
