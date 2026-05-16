"use client";

import React, { memo } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";

export type ShotGroupNodeData = {
  id: string;
  type: "IMAGE" | "VIDEO";
  index: number;
};

export type ShotGroupNode = Node<ShotGroupNodeData, "shotGroup">;

function ShotGroupNode({ data, selected }: NodeProps<ShotGroupNode>) {
  const isVideo = data.type === "VIDEO";

  return (
    <div
      className={cn(
        "relative w-full h-full rounded-xl  border-border border-2 transition-all duration-500 bg-card",
        selected && "border-primary/40",
      )}
    >
      {/* Label for the shot group */}
      <div className="absolute -top-9 left-0 flex items-center gap-3">
        <div className={cn("text-base px-4 font-bold")}>
          {isVideo ? "Motion Shot" : "Visual Shot"} {data.index + 1}
        </div>
      </div>
    </div>
  );
}

export default memo(ShotGroupNode);
