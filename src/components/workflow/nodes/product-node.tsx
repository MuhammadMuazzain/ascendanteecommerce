"use client";

import React, { memo } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import { Package, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type ProductNodeData = {
  products?: { id: string; name: string; url: string }[];
};

export type ProductNode = Node<ProductNodeData, "product">;

function ProductNode({ id, data, selected }: NodeProps<ProductNode>) {
  const hasProducts = data.products && data.products.length > 0;

  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10 shrink-0">
          <CardTitle className="text-sm font-semibold flex-1 py-3">Video Assets</CardTitle>
        </CardHeader>

        <CardContent className="p-0 px-4 space-y-4">
          <div className="space-y-2.5 flex flex-col">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              Products
            </Label>
            {hasProducts ? (
              <div className="grid grid-cols-2 gap-3">
                {data.products!.map((product, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/30 group/img shadow-sm"
                  >
                    <img
                      src={product.url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-background/90 backdrop-blur-md border-t border-border/50">
                      <p className="text-[9px] font-black text-foreground truncate text-center uppercase tracking-tighter">
                        {product.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border/50 rounded-lg bg-muted/10 gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border/50 shadow-inner">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                  Empty Library
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center z-10 hover:!border-primary/50 transition-colors cursor-crosshair"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <ImageIcon className="w-4 h-4 text-muted-foreground/70" />
      </Handle>
    </div>
  );
}

export default memo(ProductNode);
