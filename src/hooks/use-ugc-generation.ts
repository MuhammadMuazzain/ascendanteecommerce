"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSchemaStore } from "@/stores/schema-store";
import type { GeneratedAsset } from "@/stores/schema-store";
import type { Segment } from "@/lib/schema-generator/types";
import { nanoid } from "nanoid";

export function useUGCGeneration() {
  const {
    schema,
    frames,
    avatarUrl,
    productUrls,
    updateFrame,
    setSchema,
    updateSegment,
    addSegmentAsset,
    updateSegmentAsset,
  } = useSchemaStore();

  const [generatingFrames, setGeneratingFrames] = useState<Record<string, boolean>>({});
  const [generatingVideos, setGeneratingVideos] = useState<Record<string, boolean>>({});
  const pollingResumed = useRef(false);

  const persistSegment = useCallback(
    async (segmentId: string, updates: Partial<Segment>) => {
      if (!schema?.id) return;
      try {
        await fetch(`/api/scheme/${schema.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segments: [{ id: segmentId, ...updates }],
          }),
        });
      } catch (error) {
        console.error("Failed to persist segment:", error);
      }
    },
    [schema?.id],
  );

  const pollGenerationStatus = useCallback(
    async (segmentId: string, generationId: string, assetId: string, attempt = 0) => {
      const MAX_ATTEMPTS = 120;
      const INTERVAL = 3000;

      if (attempt > MAX_ATTEMPTS) {
        console.error(`Polling timed out for segment ${segmentId}`);
        updateSegmentAsset(segmentId, assetId, {
          status: "failed",
          error: "Polling timed out",
        });
        setGeneratingFrames((prev) => ({ ...prev, [segmentId]: false }));
        setGeneratingVideos((prev) => ({ ...prev, [segmentId]: false }));
        return;
      }

      try {
        const response = await fetch(`/api/workflow/generation/status?id=${generationId}`);
        if (!response.ok) throw new Error("Failed to fetch status");

        const result = await response.json();
        const status = result?.status;

        if (status === "COMPLETED") {
          const url = result.output?.url;

          if (url) {
            const frameAsset = {
              segmentId,
              url,
              prompt: "",
            };

            const currentAsset = useSchemaStore
              .getState()
              .schema?.segments?.find((s) => s.id === segmentId)
              ?.assets?.find((a) => a.id === assetId);

            if (currentAsset) {
              frameAsset.prompt = currentAsset.prompt ?? "";
            }

            if (currentAsset?.type === "image") {
              updateFrame(segmentId, frameAsset);
            }

            updateSegmentAsset(segmentId, assetId, {
              status: "completed",
              url,
              progress: 100,
            });

            const updatedSegment = useSchemaStore
              .getState()
              .schema?.segments?.find((s) => s.id === segmentId);
            if (updatedSegment) {
              await persistSegment(segmentId, {
                assets: updatedSegment.assets || [],
              });
            }

            setGeneratingFrames((prev) => ({ ...prev, [segmentId]: false }));
            setGeneratingVideos((prev) => ({ ...prev, [segmentId]: false }));
            return;
          }
        }

        if (status === "FAILED") {
          const error = result.output?.error || "Generation failed";
          console.error(`Generation failed for segment ${segmentId}:`, error);
          updateSegmentAsset(segmentId, assetId, { status: "failed", error });

          setGeneratingFrames((prev) => ({ ...prev, [segmentId]: false }));
          setGeneratingVideos((prev) => ({ ...prev, [segmentId]: false }));
          return;
        }

        if (status === "PROGRESS") {
          updateSegmentAsset(segmentId, assetId, { progress: result.progress });
        }

        // Continue polling
        setTimeout(
          () => pollGenerationStatus(segmentId, generationId, assetId, attempt + 1),
          INTERVAL,
        );
      } catch (error) {
        console.error(`Error polling status for ${segmentId}:`, error);
        setTimeout(
          () => pollGenerationStatus(segmentId, generationId, assetId, attempt + 1),
          INTERVAL,
        );
      }
    },
    [updateFrame, updateSegmentAsset, persistSegment],
  );

  const handleGenerateUGCImage = useCallback(
    async (segmentId: string) => {
      const selectedSegment = (schema?.segments || []).find((s) => s.id === segmentId);
      if (!segmentId || !selectedSegment || !schema) return;

      try {
        setGeneratingFrames((prev) => ({ ...prev, [segmentId]: true }));

        const assetId = nanoid();
        const prompt =
          selectedSegment.shots?.[0]?.firstFrame ||
          selectedSegment.shots?.[0]?.scenePrompt ||
          selectedSegment.description ||
          "";

        addSegmentAsset(segmentId, {
          id: assetId,
          type: "image",
          prompt,
          status: "generating",
          createdAt: Date.now(),
        });

        const updatedSegment = useSchemaStore
          .getState()
          .schema?.segments?.find((s) => s.id === segmentId);
        if (updatedSegment) {
          await persistSegment(segmentId, {
            assets: updatedSegment.assets || [],
          });
        }

        // Find the previous segment's frame for scene consistency
        const currentIndex = (schema.segments || []).findIndex((s) => s.id === segmentId);
        let previousFrameUrl: string | undefined;

        if (currentIndex > 0) {
          for (let i = currentIndex - 1; i >= 0; i--) {
            const prevSeg = schema.segments?.[i];
            if (!prevSeg) continue;
            if (frames && frames[prevSeg.id]?.url) {
              previousFrameUrl = frames[prevSeg.id].url;
              break;
            }
          }
        }

        const response = await fetch("/api/workflow/generate-ugc-shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemeId: schema.id,
            segmentId: selectedSegment.id,
            shotId: selectedSegment.shots?.[0]?.id,
            text: selectedSegment.text,
            prompt, // Standardized from description
            previousFrameUrl,
            avatarUrl,
            productUrls,
            aspectRatio: schema.aspectRatio || "9:16",
            mode: "image",
          }),
        });

        if (!response.ok) throw new Error("Failed to generate frames");

        const { generationId } = await response.json();

        if (generationId) {
          updateSegmentAsset(selectedSegment.id, assetId, { taskId: generationId });
          pollGenerationStatus(selectedSegment.id, generationId, assetId);
        }
      } catch (error) {
        console.error("Error initiating frame:", error);
        setGeneratingFrames((prev) => ({ ...prev, [segmentId]: false }));
      }
    },
    [schema, avatarUrl, productUrls, frames, addSegmentAsset, persistSegment, pollGenerationStatus],
  );

  const handleGenerateUGCVideo = useCallback(
    async (segmentId: string, options?: { mode?: string; firstFrameSource?: string }) => {
      const selectedSegment = (schema?.segments || []).find((s) => s.id === segmentId);
      if (!segmentId || !selectedSegment || !schema) return;

      try {
        setGeneratingVideos((prev) => ({ ...prev, [segmentId]: true }));

        const assetId = nanoid();
        const prompt = selectedSegment.shots?.[0]?.videoPrompt || selectedSegment.description || "";

        addSegmentAsset(segmentId, {
          id: assetId,
          type: "video",
          prompt,
          status: "generating",
          createdAt: Date.now(),
        });

        const updatedSegment = useSchemaStore
          .getState()
          .schema?.segments?.find((s) => s.id === segmentId);
        if (updatedSegment) {
          await persistSegment(segmentId, {
            assets: updatedSegment.assets || [],
          });
        }

        const currentIndex = (schema.segments || []).findIndex((s) => s.id === segmentId);
        let lastFrameUrl: string | undefined;

        if (currentIndex < (schema.segments || []).length - 1) {
          for (let i = currentIndex + 1; i < (schema.segments || []).length; i++) {
            const nextSeg = schema.segments?.[i];
            if (!nextSeg) continue;
            if (frames && frames[nextSeg.id]?.url) {
              lastFrameUrl = frames[nextSeg.id].url;
              break;
            }
          }
        }

        // console.log("Generating video with:", {
        //   schemaId: schema.id,
        //   segmentId: selectedSegment.id,
        //   shotId: selectedSegment.shots?.[0]?.id,
        //   text: selectedSegment.text,
        //   scenePrompt: selectedSegment.shots?.[0]?.scenePrompt,
        //   videoPrompt: prompt,
        //   firstFrameUrl: frames[segmentId]?.url,
        //   lastFrameUrl,
        //   aspectRatio: schema.aspectRatio || "9:16",
        //   avatarUrl,
        //   productUrls,
        //   mode: options?.mode,
        //   firstFrameSource: options?.firstFrameSource,
        // })
        // return
        const response = await fetch("/api/workflow/generate-ugc-shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemeId: schema.id,
            segmentId: selectedSegment.id,
            shotId: selectedSegment.shots?.[0]?.id,
            text: selectedSegment.text,
            prompt, // Standardized from videoPrompt
            firstFrameUrl: frames[segmentId]?.url,
            lastFrameUrl,
            aspectRatio: schema.aspectRatio || "9:16",
            avatarUrl,
            productUrls,
            mode: options?.mode,
            firstFrameSource: options?.firstFrameSource,
          }),
        });

        if (!response.ok) throw new Error("Failed to initiate video generation");

        const { generationId } = await response.json();

        if (generationId) {
          updateSegmentAsset(selectedSegment.id, assetId, { taskId: generationId });
          pollGenerationStatus(selectedSegment.id, generationId, assetId);

          const currentAssets =
            useSchemaStore.getState().schema?.segments?.find((s) => s.id === segmentId)?.assets ||
            [];
          await persistSegment(segmentId, { assets: currentAssets });
        }
      } catch (error) {
        console.error("Error initiating video:", error);
        setGeneratingVideos((prev) => ({ ...prev, [segmentId]: false }));
      }
    },
    [schema, avatarUrl, productUrls, frames, addSegmentAsset, persistSegment, pollGenerationStatus],
  );

  // Resume polling on load for frames
  useEffect(() => {
    if (schema && !pollingResumed.current && schema.segments) {
      pollingResumed.current = true;
      const newGeneratingFrames: Record<string, boolean> = {};

      (schema.segments || []).forEach((seg) => {
        seg.assets?.forEach((asset) => {
          if (asset.status === "generating" && asset.taskId) {
            if (asset.type === "image") {
              newGeneratingFrames[seg.id] = true;
              pollGenerationStatus(seg.id, asset.taskId, asset.id);
            }
            // Videos are now handled by schema polling below
          }
        });
      });

      if (Object.keys(newGeneratingFrames).length > 0) {
        setGeneratingFrames((prev) => ({ ...prev, ...newGeneratingFrames }));
      }
    }
  }, [schema, pollGenerationStatus]);

  // Schema polling for ongoing video generations
  useEffect(() => {
    if (!schema?.id) return;

    // Check if we have any video assets in 'generating' state
    const hasGeneratingVideos = (schema.segments || []).some((seg) =>
      seg.assets?.some((a) => a.type === "video" && a.status === "generating"),
    );

    // Also use the hook state as a fallback/trigger
    const isGeneratingVideoState = Object.values(generatingVideos).some((v) => v);

    if (hasGeneratingVideos || isGeneratingVideoState) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/scheme/${schema.id}`);
          if (res.ok) {
            const updatedSchema = await res.json();

            // Compare assets to see if we should stop generating state
            let stillGenerating = false;
            updatedSchema.segments.forEach((updatedSeg: Segment) => {
              const originalSeg = (schema.segments || []).find((s) => s.id === updatedSeg.id);
              if (!originalSeg) return;

              updatedSeg.assets?.forEach((updatedAsset) => {
                if (updatedAsset.type === "video") {
                  const originalAsset = originalSeg.assets?.find((a) => a.id === updatedAsset.id);
                  if (
                    originalAsset?.status === "generating" &&
                    updatedAsset.status === "completed"
                  ) {
                    // Asset completed!
                    setGeneratingVideos((prev) => ({
                      ...prev,
                      [updatedSeg.id]: false,
                    }));
                  } else if (updatedAsset.status === "generating") {
                    stillGenerating = true;
                  }
                }
              });
            });

            setSchema(updatedSchema);
          }
        } catch (e) {
          console.error("Failed to poll schema:", e);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [schema, generatingVideos, setSchema]);

  const handleTranscribeVideo = useCallback(
    async (segmentId: string) => {
      const selectedSegment = (schema?.segments || []).find((s) => s.id === segmentId);
      if (!segmentId || !selectedSegment || !schema) return;

      // Find the video asset
      const videoAsset = selectedSegment.assets?.find(
        (a) => a.type === "video" && a.status === "completed" && a.url,
      );
      if (!videoAsset || !videoAsset.url) {
        console.error("No completed video found for transcription");
        return;
      }

      try {
        // Optimistic update status if needed, or just toast
        // For now we just fire and forget, but we could add a "transcribing" state

        const transcribeResponse = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoAsset.url }),
        });

        if (transcribeResponse.ok) {
          const transcription = await transcribeResponse.json();
          console.log("Transcription:", transcription);
          // Update segment with transcription
          // updateSegment(segmentId, { transcription });
          // await persistSegment(segmentId, { transcription });
        } else {
          console.error("Transcription failed");
        }
      } catch (e) {
        console.error("Failed to generate captions:", e);
      }
    },
    [schema, updateSegment, persistSegment],
  );

  return {
    handleGenerateUGCImage,
    handleGenerateUGCVideo,
    handleTranscribeVideo,
    generatingFrames,
    generatingVideos,
    persistSegment,
  };
}
