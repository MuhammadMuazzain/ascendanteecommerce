import { useState } from "react";
import { Button } from "./ui/button";
import { Icons } from "./shared/icons";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { useVideoConfigStore } from "@/stores/video-config-store";
import { ChevronRight } from "lucide-react";

interface PromptInputBoxProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFolderClick?: () => void;
  onSubmit?: () => void | Promise<void>;
  className?: string;
  inputClassName?: string;
}

export function PromptInputBox({
  placeholder = "Ask scenify",
  value,
  onChange,
  onFolderClick,
  onSubmit,
  className = "",
  inputClassName = "",
}: PromptInputBoxProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const isValid = (value?.trim() ?? "").length > 0;
  const { params, setParams } = useVideoConfigStore();
  const quality = params.quality || "regular";
  const duration = params.duration || 30;

  const handleSubmit = async () => {
    if (!isValid || isLoading) return;

    setIsLoading(true);
    try {
      const result = onSubmit?.();
      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`px-4 w-full max-w-full md:max-w-lg ${className}`}>
      <div className="relative rounded-2xl shadow-xs backdrop-blur">
        <div className="bg-primary/10 flex flex-col rounded-2xl">
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={`mb-2 h-12 w-full resize-none bg-transparent outline-none px-4 py-3   ${inputClassName}`}
          />

          <div className="mt-auto h-10 px-2 flex justify-between">
            <div>
              <Button variant="ghost" onClick={onFolderClick} className="rounded-full size-7">
                <Icons.folder className="size-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full size-7">
                    <Icons.settingsSimple className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2 bg-zinc-800/90 backdrop-blur-md">
                  <div className="space-y-1">
                    <Popover open={isQualityOpen} onOpenChange={setIsQualityOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-700/50 transition-colors"
                        >
                          <span>Quality</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {quality === "regular" ? "Regular" : "High"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="right"
                        className="w-40 p-2 bg-zinc-800/90 backdrop-blur-md"
                      >
                        <RadioGroup
                          value={quality}
                          onValueChange={(value) => {
                            setParams({ quality: value as "regular" | "high" });
                            setIsQualityOpen(false);
                            setIsSettingsOpen(false);
                          }}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="regular" id="quality-regular" />
                            <Label
                              htmlFor="quality-regular"
                              className="text-sm font-normal cursor-pointer"
                            >
                              Regular
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="quality-high" />
                            <Label
                              htmlFor="quality-high"
                              className="text-sm font-normal cursor-pointer"
                            >
                              High
                            </Label>
                          </div>
                        </RadioGroup>
                      </PopoverContent>
                    </Popover>

                    <Popover open={isDurationOpen} onOpenChange={setIsDurationOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-zinc-700/50 transition-colors"
                        >
                          <span>Duration</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">{duration}s</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="right"
                        className="w-40 p-2 bg-zinc-800/90 backdrop-blur-md"
                      >
                        <RadioGroup
                          value={duration.toString()}
                          onValueChange={(value) => {
                            setParams({
                              duration: parseInt(value, 10) as 30 | 45 | 60,
                            });
                            setIsDurationOpen(false);
                            setIsSettingsOpen(false);
                          }}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="duration-30" />
                            <Label
                              htmlFor="duration-30"
                              className="text-sm font-normal cursor-pointer"
                            >
                              30 seconds
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="45" id="duration-45" />
                            <Label
                              htmlFor="duration-45"
                              className="text-sm font-normal cursor-pointer"
                            >
                              45 seconds
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="60" id="duration-60" />
                            <Label
                              htmlFor="duration-60"
                              className="text-sm font-normal cursor-pointer"
                            >
                              60 seconds
                            </Label>
                          </div>
                        </RadioGroup>
                      </PopoverContent>
                    </Popover>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant={isValid ? "default" : "outline"}
                size="icon"
                onClick={handleSubmit}
                disabled={isLoading || !isValid}
                className="rounded-full size-7 "
              >
                {isLoading ? (
                  <Icons.spinner className="size-5 animate-spin" />
                ) : (
                  <Icons.arrowUp className="size-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
