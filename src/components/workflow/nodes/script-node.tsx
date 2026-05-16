"use client";

import React, { memo, useRef } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { AlignLeft, Type, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type ScriptNodeData = {
  text: string;
  onUpdate?: (id: string, updates: any) => void;
};

export type ScriptNode = Node<ScriptNodeData, "script">;

function ScriptNode({ id, data, selected }: NodeProps<ScriptNode>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1 py-3">Scene Script</CardTitle>
        </CardHeader>
        <div className="flex flex-col h-full">
          <CardContent className="p-4 space-y-5 flex-1 flex flex-col">
            <div className="space-y-2.5 flex flex-col">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                Script Content
              </Label>
              <Textarea
                ref={textareaRef}
                value={data.text || ""}
                onChange={(e) => data.onUpdate?.(id, { text: e.target.value })}
                placeholder="Enter scene script..."
                className="nodrag nopan nowheel w-full h-[180px] p-4 text-[13px] leading-relaxed text-foreground font-medium bg-background border border-border shadow-sm rounded-md focus-visible:ring-1 focus-visible:ring-primary/40 transition-all resize-none overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10"
              />
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Handles */}
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <AlignLeft className="w-4 h-4 text-muted-foreground/70" />
      </Handle>

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Menu className="w-4 h-4 text-muted-foreground/70" />
      </Handle>
    </div>
  );
}

export default memo(ScriptNode);
