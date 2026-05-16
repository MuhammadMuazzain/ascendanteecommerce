"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCustomization } from "@/components/generation-steps/video-customization";
import { useScriptStore } from "@/stores/script-store";
import { useSchemaStore } from "@/stores/schema-store";
import { useVideoGenerationStore } from "@/stores/video-generation-store";
import { useVideoConfigStore } from "@/stores/video-config-store";
import { defaultGenerationParams, type GenerateScriptParams } from "@/lib/generation/constants";
import type { Schema } from "@/lib/schema-generator/types";
import { useEffect, useState, Suspense } from "react";
import { Assistant } from "@/components/script-to-video/assistant";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { calculateVideoCreditCost } from "@/lib/generation/costs";
import { VideoType, FrameStyle } from "@/utils/enum";

const EMPTY_GENERATION_PARAMS: Partial<Schema> = {};

function ScriptToVideoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as
    | "narrative-video"
    | "product-video-ad"
    | "product-image-ad"
    | "ugc-video-ad"
    | "fake-ugc-video-ad"
    | "character-driven-ad"
    | null;

  const { script } = useScriptStore();
  const schema = useSchemaStore((state) => state.schema);
  const generationParams = (schema ?? EMPTY_GENERATION_PARAMS) as Partial<Schema>;
  const setGenerationParams = useSchemaStore((state) => state.updateSchema);
  const setVideoParams = useVideoConfigStore((state) => state.setParams);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Fresh schema per flow — avoid merging setup fields onto a previous storyboard schema (update loops)
  useEffect(() => {
    if (!mode) return;

    const defaults = defaultGenerationParams({ script, type: mode });
    setVideoParams({ type: mode });

    const base = {
      ...defaults,
      type: mode,
      script,
      id: undefined,
      segments: undefined,
      blocks: defaults.blocks,
    };

    if (mode === "product-image-ad") {
      useSchemaStore.getState().setSchema({
        ...base,
        visuals: { type: VideoType.AI_IMAGES, style: FrameStyle.Cinematic },
      } as Schema);
    } else if (mode === "product-video-ad") {
      useSchemaStore.getState().setSchema({
        ...base,
        visuals: { type: VideoType.AI_VIDEOS, style: FrameStyle.Realism },
      } as Schema);
    } else {
      useSchemaStore.getState().setSchema(base as Schema);
    }
  }, [mode, setVideoParams]);

  // Sync script parameter with prompt changes
  useEffect(() => {
    if (!mode) return;
    const current = useSchemaStore.getState().schema?.script ?? "";
    if (script === current) return;
    setGenerationParams({ script });
  }, [script, mode, setGenerationParams]);

  const handleGenerate = async () => {
    console.log("generationParams", generationParams);
    setIsGenerating(true);
    const isCharacterAd = generationParams.type === "character-driven-ad";
    if (!generationParams.script && !isCharacterAd) {
      console.warn("Missing required parameters for generation");
      setIsGenerating(false);
      return;
    }

    try {
      const { startGeneration } = useVideoGenerationStore.getState();
      const jobId = await startGeneration(generationParams as GenerateScriptParams);

      if (jobId) {
        router.push(`/storyboard/${jobId}`);
      }
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while starting the generation.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const isUGC = generationParams.type === "ugc-video-ad";
  const selectedVisualType = generationParams.visuals?.type || VideoType.AI_IMAGES;

  const title =
    generationParams.type === "character-driven-ad"
      ? "Character-Driven Ad"
      : generationParams.type === "product-video-ad"
        ? "Product Video Ad"
        : generationParams.type === "product-image-ad"
          ? "Product Image Ad"
          : isUGC
            ? "UGC Video"
            : "Narrative Video";

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950">
      <div className="h-13 border-b border-border w-full flex-none bg-card flex items-center justify-between px-4 text-sm z-10">
        <div className="font-medium">{title}</div>
        <div className="flex items-center gap-4">
          {!isUGC && (
            <div className="text-muted-foreground text-xs">
              Total cost {calculateVideoCreditCost(script, selectedVisualType)} credits
            </div>
          )}
          <Button
            onClick={handleGenerate}
            size={"sm"}
            disabled={isGenerating}
            className="rounded-full text-primary-foreground"
          >
            {isGenerating
              ? isUGC
                ? "Generating..."
                : "Generating..."
              : isUGC
                ? "Generate"
                : "Generate"}
          </Button>
        </div>
      </div>
      <div className="flex flex-1 h-[calc(100vh-52px)] w-full overflow-hidden">
        <div className="h-full w-[480px] scrollbar-thin">
          <Assistant />
        </div>

        <VideoCustomization
          key={mode ?? "default"}
          mode={mode}
          generationParams={generationParams}
          setGenerationParams={setGenerationParams}
        />
      </div>

      <AlertDialog
        open={!!generationError}
        onOpenChange={(open) => !open && setGenerationError(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generation Failed</AlertDialogTitle>
            <AlertDialogDescription>{generationError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGenerationError(null)}>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-background animate-pulse" />}>
      <ScriptToVideoContent />
    </Suspense>
  );
}
