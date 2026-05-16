import React from "react";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AnimationConfigProps {
  enabled?: boolean;
  onChange?: (enabled: boolean) => void;
  behavior?: "expansion" | "mirror";
  onBehaviorChange?: (behavior: "expansion" | "mirror") => void;
}

const AnimationConfig = ({
  enabled,
  onChange,
  behavior,
  onBehaviorChange,
}: AnimationConfigProps) => {
  return (
    <div className="items-center justify-between px-6  font-medium py-6 space-y-6">
      <div className="flex items-center">Animations</div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4 border-b border-border/50 pb-6">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Active</div>
            <div className="text-xs text-muted-foreground">
              Random animation will be applied to the clips
            </div>
          </div>
          <Switch id="animation" checked={enabled} onCheckedChange={onChange} />
        </div>

        {/* {enabled && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] items-center gap-4 border-b border-border/50 pb-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Behavior
              </div>
              <div className="text-xs text-muted-foreground">
                Choose how you want the media to behave
              </div>
            </div>

            <Select
              value={behavior}
              onValueChange={(value) =>
                onBehaviorChange?.(value as "expansion" | "mirror")
              }
            >
              <SelectTrigger className="w-full h-12 bg-secondary/50 border-border hover:border-border/80 transition-colors">
                <SelectValue placeholder="Select Option" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="expansion">Expansion</SelectItem>
                <SelectItem value="mirror">Mirror</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default AnimationConfig;
