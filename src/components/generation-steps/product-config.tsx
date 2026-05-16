"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProductConfigProps {
  product: {
    name: string;
    description: string;
  };
  onProductChange: (product: { name: string; description: string }) => void;
}

export function ProductConfig({ product, onProductChange }: ProductConfigProps) {
  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center font-medium">Product</div>

      <div className="space-y-2">
        <div className="space-y-1">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Product Name</div>
            <div className="text-xs text-muted-foreground">Enter the name of the product</div>
          </div>
          <Input
            id="product-name"
            placeholder="e.g. iPhone 15 Pro"
            value={product.name}
            onChange={(e) => onProductChange({ ...product, name: e.target.value })}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Product Description</div>
            <div className="text-xs text-muted-foreground">
              Describe your product for better visual generation
            </div>
          </div>
          <Textarea
            id="product-description"
            placeholder="Describe your product here..."
            value={product.description}
            onChange={(e) => onProductChange({ ...product, description: e.target.value })}
            className="min-h-20 text-sm resize-none"
          />
        </div>
      </div>
    </div>
  );
}
