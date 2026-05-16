"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { FileText, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type GlobalScriptNodeData = {
  label?: string;
  text?: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type GlobalScriptNode = Node<GlobalScriptNodeData, "globalScript">;

function GlobalScriptNode({ id, data, selected }: NodeProps<GlobalScriptNode>) {
  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1 py-0">Entrypoint</CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-5 flex-1 flex flex-col">
          {/* ── Script Content ── */}
          <div className="space-y-2.5 flex flex-col">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              Master Script
            </Label>
            <Textarea
              value={data.text || ""}
              onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
              placeholder="Enter the master script for your video..."
              className="nodrag nopan nowheel min-h-[150px] p-4 text-[13px] leading-relaxed text-foreground font-medium bg-background border border-border shadow-sm rounded-md focus-visible:ring-1 focus-visible:ring-primary/40 transition-all resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Handles */}
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Menu className="w-4 h-4 text-muted-foreground" />
      </Handle>
    </div>
  );
}

export default memo(GlobalScriptNode);
