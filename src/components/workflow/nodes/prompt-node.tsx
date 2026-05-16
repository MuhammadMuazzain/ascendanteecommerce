"use client";

import React, { memo, useRef, useState } from "react";
import { Position, type NodeProps, type Node, Handle } from "@xyflow/react";
import {
  PencilRuler,
  Play,
  Sparkles,
  Type,
  Check,
  Loader2Icon,
  ImageIcon,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NANO_BANANA_MODELS = [
  {
    id: "gemini-2.5-flash-image",
    name: "Nano Banana",
    description: "Gemini 2.5 Flash Image",
  },
  {
    id: "gemini-3.1-flash-image-preview",
    name: "Nano Banana 2",
    description: "Gemini 3.1 Flash Image Preview",
  },
  {
    id: "gemini-3-pro-image-preview",
    name: "Nano Banana Pro",
    description: "Gemini 3 Pro Image Preview",
  },
] as const;

const VEO_MODELS = [
  {
    id: "veo-3.1-generate-preview",
    name: "Veo 3.1",
    description: "veo-3.1-generate-preview",
  },
  {
    id: "veo-3.1-fast-generate-preview",
    name: "Veo 3.1 Fast",
    description: "veo-3.1-fast-generate-preview",
  },
  {
    id: "veo-3.1-lite-generate-preview",
    name: "Veo 3.1 Lite",
    description: "veo-3.1-lite-generate-preview",
  },
] as const;

type NanoBananaModelId = (typeof NANO_BANANA_MODELS)[number]["id"];
type VeoModelId = (typeof VEO_MODELS)[number]["id"];
type AnyModelId = NanoBananaModelId | VeoModelId;

const SHOT_TYPES = [
  { id: "product", label: "Product" },
  { id: "generic", label: "Generic" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "b-roll", label: "B-Roll" },
] as const;

type ShotTypeId = (typeof SHOT_TYPES)[number]["id"];

// Banana icon as inline SVG
function BananaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1-7.78 7.78C4 20 3.5 15.5 4 13Z" />
      <path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 4.5 11" />
    </svg>
  );
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined || ms === null) return "--";
  const s = (ms / 1000).toFixed(2);
  return `${s}s`;
}

export type PromptNodeData = {
  type: "IMAGE" | "VIDEO";
  shotType?: "product" | "generic" | "lifestyle" | "b-roll" | string;
  shotIndex?: number;
  promptText: string;
  status: "idle" | "processing" | "success" | "error";
  model?: string;
  mode?: "FIRST_FRAME_TO_VIDEO" | "REFERENCE_TO_VIDEO";
  firstFrameSource?: "last_frame" | "avatar";
  assets?: { id: string; url: string; name: string; type: string }[];
  segmentId?: string;
  schemaType?: string;
  words?: string;
  display?: { from: number; to: number };
  onUpdate?: (id: string, updates: any) => void;
  onGenerate?: (
    segmentId: string,
    shotIndexStr: string,
    type: "IMAGE" | "VIDEO",
    model?: string,
    options?: { mode?: string; firstFrameSource?: string; shotType?: string },
  ) => void;
};

export type PromptNode = Node<PromptNodeData, "prompt">;

function PromptNode({ id, data, selected }: NodeProps<PromptNode>) {
  const isVideo = data.type === "VIDEO";
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MODELS = isVideo ? VEO_MODELS : NANO_BANANA_MODELS;
  const defaultModelId = isVideo ? "veo-3.1-fast-generate-preview" : "gemini-2.5-flash-image";

  const [selectedModel, setSelectedModel] = useState<AnyModelId>(
    (data.model as AnyModelId) ?? defaultModelId,
  );
  const [selectedShotType, setSelectedShotType] = useState<ShotTypeId>(
    (data.shotType as ShotTypeId) ?? "generic",
  );

  const activeModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];
  const activeShotType = SHOT_TYPES.find((s) => s.id === selectedShotType) ?? SHOT_TYPES[1];

  const handleModelChange = (modelId: AnyModelId) => {
    setSelectedModel(modelId);
    data.onUpdate?.(id, { model: modelId });
  };

  const handleShotTypeChange = (typeId: ShotTypeId) => {
    setSelectedShotType(typeId);
    data.onUpdate?.(id, { shotType: typeId });
  };

  const hasDisplay = data.display !== undefined;
  const shotTypeIsProduct = selectedShotType === "product";

  return (
    <div className="relative group/node min-w-[340px] max-w-[380px]">
      <Card
        className={cn(
          "relative w-full h-full rounded-md border-2 transition-all duration-300 shadow-sm overflow-hidden",
          selected ? "border-primary/40 shadow-md" : "border-border/50 hover:border-border",
        )}
      >
        <CardHeader className="px-4 h-10  py-0 border-b border-border/40 flex flex-row items-center gap-2 space-y-0 bg-muted/10">
          {/* {isVideo ? (
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <PencilRuler className="w-4 h-4 text-primary shrink-0" />
          )} */}
          <CardTitle className="text-sm font-semibold flex-1">
            {isVideo ? "Motion Prompt" : "Visual Prompt"}
          </CardTitle>
          <div className="flex items-center">
            {data.status === "processing" && (
              <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {data.status === "success" && <Check className="w-4 h-4 text-green-500" />}
          </div>
        </CardHeader>

        <div className="flex flex-col h-full">
          <CardContent className="p-4 space-y-5 flex-1 flex flex-col">
            {/* ── Prompt ── */}
            <div className="space-y-2.5 flex flex-col">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                Prompt
              </Label>
              <Textarea
                ref={textareaRef}
                value={data.promptText || ""}
                onChange={(e) =>
                  data.onUpdate?.(id, {
                    promptText: e.target.value,
                    segmentId: data.segmentId,
                    shotIndex: data.shotIndex,
                    mediaType: data.type === "VIDEO" ? "vid" : "img",
                  })
                }
                placeholder="Describe the visual scene..."
                className="nodrag nopan nowheel min-h-[100px] max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent text-[13px] leading-relaxed resize-none focus-visible:ring-1 focus-visible:ring-primary/40 bg-background shadow-sm"
              />
            </div>

            {/* ── Model ── */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Model
              </Label>
              <Select
                value={activeModel?.id}
                onValueChange={(val) => handleModelChange(val as AnyModelId)}
              >
                <SelectTrigger className="nodrag w-full h-auto px-3 py-2 bg-muted/20 border-border/40 hover:border-primary/40 hover:bg-muted/40 text-left focus:ring-1 focus:ring-primary/40 shadow-sm [&_[data-desc]]:hidden">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent align="start">
                  {MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="py-2 cursor-pointer">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {isVideo ? (
                          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <BananaIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-semibold text-foreground">
                            {model.name}
                          </span>
                          <span data-desc className="text-[10px] text-muted-foreground/60">
                            {model.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Mode + First Frame Source (video only) ── */}
            {isVideo && (
              <div
                className={cn(
                  "grid gap-3",
                  data.schemaType === "ugc-video-ad" ? "grid-cols-2" : "grid-cols-1",
                )}
              >
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Mode
                  </Label>
                  <Select
                    value={data.mode || "FIRST_FRAME_TO_VIDEO"}
                    onValueChange={(val: any) => data.onUpdate?.(id, { mode: val })}
                  >
                    <SelectTrigger className="nodrag w-full bg-muted/20 border-border/40 hover:border-primary/40 hover:bg-muted/40 focus:ring-1 focus:ring-primary/40 text-[12px] shadow-sm">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem
                        value="FIRST_FRAME_TO_VIDEO"
                        className="text-[12px] cursor-pointer"
                      >
                        First Frame to Video
                      </SelectItem>
                      <SelectItem value="REFERENCE_TO_VIDEO" className="text-[12px] cursor-pointer">
                        Reference to Video
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {data.schemaType === "ugc-video-ad" && (
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3" />
                      First Frame Source
                    </Label>
                    <Select
                      value={data.firstFrameSource || "last_frame"}
                      onValueChange={(val: any) => data.onUpdate?.(id, { firstFrameSource: val })}
                    >
                      <SelectTrigger className="nodrag w-full bg-muted/20 border-border/40 hover:border-primary/40 hover:bg-muted/40 focus:ring-1 focus:ring-primary/40 text-[12px] shadow-sm">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="last_frame" className="text-[12px] cursor-pointer">
                          Use Last Frame
                        </SelectItem>
                        <SelectItem value="avatar" className="text-[12px] cursor-pointer">
                          Use Avatar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* ── Shot Type ── */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                Shot Type
              </Label>
              <Select
                value={activeShotType?.id}
                onValueChange={(val) => handleShotTypeChange(val as ShotTypeId)}
              >
                <SelectTrigger className="nodrag w-full bg-muted/20 border-border/40 hover:border-primary/40 hover:bg-muted/40 focus:ring-1 focus:ring-primary/40 shadow-sm">
                  <SelectValue placeholder="Select shot type" />
                </SelectTrigger>
                <SelectContent align="start">
                  {SHOT_TYPES.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            st.id === "product" ? "bg-amber-400" : "bg-blue-400",
                          )}
                        />
                        <span className="text-[12px] font-medium">{st.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Assets / Product Images ── */}
            {shotTypeIsProduct && data.assets && data.assets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" />
                  {data.type === "VIDEO" ? "Source Image" : "Product Images"}
                </Label>
                <div className="flex flex-row gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent">
                  {data.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border/50 bg-muted/30 group/asset shadow-sm"
                      title={asset.name}
                    >
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/asset:scale-110"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-primary/0 group-hover/asset:ring-primary/40 rounded-lg transition-all duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Words ── */}
            {data.words && (
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Type className="w-3 h-3" />
                  Words
                </Label>
                <p className="text-[12px] text-muted-foreground/80 italic leading-relaxed px-3 py-2 rounded-lg bg-muted/30 border border-border/40 select-none shadow-sm">
                  {data.words}
                </p>
              </div>
            )}

            {/* ── Timing ── */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Timing
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 shadow-sm">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground/60 shrink-0">
                    From
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-mono font-medium flex-1 text-center",
                      hasDisplay ? "text-foreground" : "text-muted-foreground/40",
                    )}
                  >
                    {formatMs(data.display?.from)}
                  </span>
                </div>
                <span className="text-muted-foreground/40 text-[10px] shrink-0 font-bold">→</span>
                <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/40 shadow-sm">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground/60 shrink-0">
                    To
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-mono font-medium flex-1 text-center",
                      hasDisplay ? "text-foreground" : "text-muted-foreground/40",
                    )}
                  >
                    {formatMs(data.display?.to)}
                  </span>
                </div>
                {hasDisplay && data.display && (
                  <div className="px-2.5 py-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0 shadow-sm">
                    <span className="text-[12px] font-mono font-bold text-primary">
                      {formatMs(data.display.to - data.display.from)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between p-4 bg-muted/10 border-t border-border/40">
            <div className="text-[11px] text-muted-foreground font-medium">Ready to generate</div>
            <Button
              size="sm"
              className={cn("h-8 rounded-md px-4 shadow-sm transition-all shrink-0")}
              variant={data.status === "processing" ? "outline" : "default"}
              onClick={() => {
                if (data.segmentId && data.shotIndex !== undefined) {
                  data.onGenerate?.(
                    data.segmentId,
                    data.shotIndex.toString(),
                    data.type,
                    selectedModel,
                    {
                      mode: data.mode,
                      firstFrameSource: data.firstFrameSource,
                      shotType: selectedShotType,
                    },
                  );
                }
              }}
              disabled={data.status === "processing"}
            >
              {data.status === "processing" ? (
                <>
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
                  Generate
                </>
              )}
            </Button>
          </CardFooter>
        </div>
      </Card>

      {/* Input handle */}
      <Handle
        id="asset"
        type="target"
        position={Position.Left}
        className="!w-10 !h-10 !rounded-full !bg-card !border !border-border/60 !shadow-lg !flex !items-center !justify-center"
        style={{ left: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <ImageIcon className="w-4 h-4 text-muted-foreground/70 pointer-events-none" />
      </Handle>

      {/* Output handle */}
      <Handle
        id="result"
        type="source"
        position={Position.Right}
        className="!w-10 !h-10 !rounded-full !border !border-border border-2! bg-card! !shadow-lg !flex !items-center !justify-center"
        style={{ right: -40, top: "50%", transform: "translateY(-50%)" }}
      >
        <Type className="w-4 h-4" />
      </Handle>
    </div>
  );
}

export default memo(PromptNode);
