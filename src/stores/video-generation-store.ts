"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { mergeProductImagesIntoAssets } from "@/lib/ugc/product-assets";
import type { GenerateScriptParams } from "@/lib/generation/constants";

type GenerationStatus = "idle" | "generating" | "complete" | "error";

export interface GenerationJob {
  id: string;
  tempId?: string;
  progress: number;
  message: string;
  status: GenerationStatus;
  currentStep: number;
  totalSteps: number;
  sceneUrl?: string;
  createdAt: number;
}

interface GenerationStep {
  current: number;
  total: number;
  message: string;
  progress?: number;
}

interface VideoGenerationStoreState {
  jobs: GenerationJob[];
  currentJobId: string | null;
  isGenerating: boolean;
  generationStep: GenerationStep | null;
  startGeneration: (params: GenerateScriptParams) => Promise<string | null>;
  updateJobProgress: (id: string, step: GenerationStep) => void;
  updateJobId: (tempId: string, realId: string) => void;
  completeJob: (id: string, sceneUrl?: string) => void;
  failJob: (id: string, message?: string) => void;
  setCurrentJobId: (id: string | null) => void;
  clearGenerationStep: () => void;
}

export const useVideoGenerationStore = create<VideoGenerationStoreState>((set, get) => ({
  jobs: [],
  currentJobId: null,
  isGenerating: false,
  generationStep: null,

  startGeneration: async (params: GenerateScriptParams) => {
    const {
      script,
      voice,
      aspectRatio,
      visuals,
      caption,
      music,
      animation,
      assets,
      product,
      type,
      avatar,
      pacing,
      blocks,
    } = params;

    if (!script && (!blocks || blocks.length === 0)) {
      console.warn("Please enter a script or JSON blocks for video generation");
      return null;
    }

    if (!voice) {
      console.warn("Please select a voice for video generation");
      return null;
    }

    // Create temporary job immediately so it shows up in notifications
    const tempId = `temp_${nanoid()}`;
    const tempJob: GenerationJob = {
      id: tempId,
      tempId: tempId,
      progress: 0,
      message: "Creating video schema...",
      status: "generating",
      currentStep: 1,
      totalSteps: 2,
      createdAt: Date.now(),
    };

    set((state) => ({
      isGenerating: true,
      generationStep: {
        current: 1,
        total: 2,
        message: "Creating video schema",
      },
      jobs: [tempJob, ...state.jobs],
      currentJobId: tempId,
    }));

    try {
      const mergedAssets = mergeProductImagesIntoAssets({
        assets: assets || [],
        productImages: (params as { productImages?: { id?: string; name?: string; url: string }[] })
          .productImages,
        productImage: (params as { productImage?: { id?: string; name?: string; url: string } })
          .productImage,
      });

      // Send params to resolve-schema API (now handles generation too)
      const response = await fetch("/api/resolve-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheme: {
            script,
            voice,
            aspectRatio,
            visuals,
            caption,
            music,
            animation,
            assets: mergedAssets,
            productImages: (params as { productImages?: unknown }).productImages,
            productImage: (params as { productImage?: unknown }).productImage,
            type,
            product,
            pacing: pacing || "relaxed",
            executionMode: "live", // Defaulting to live
            avatar,
            blocks,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          response.status === 402
            ? "Insufficient credits. Please upgrade your plan."
            : errorData.error || `Failed to start generation: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.ok || !data.id) {
        throw new Error("Failed to start generation");
      }

      const realJobId = data.id;

      // Update the job with the real ID
      get().updateJobId(tempId, realJobId);

      // Update status to indicate server processing
      get().updateJobProgress(realJobId, {
        current: 1,
        total: 2,
        message: "Generating schema...",
        progress: 5,
      });

      return realJobId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate video";

      // Remove the temp job and mark as failed
      get().failJob(tempId, errorMessage);

      set({
        isGenerating: false,
        generationStep: null,
      });

      throw error;
    }
  },

  updateJobProgress: (id, step) => {
    set((state) => {
      const progress = step.progress ?? (step.current / step.total) * 100;

      return {
        generationStep: step,
        jobs: state.jobs.map((job) =>
          job.id === id
            ? {
                ...job,
                progress,
                message: step.message,
                currentStep: step.current,
                totalSteps: step.total,
                status: "generating",
              }
            : job,
        ),
      };
    });
  },

  updateJobId: (tempId, realId) => {
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === tempId || job.tempId === tempId ? { ...job, id: realId, tempId: tempId } : job,
      ),
      currentJobId: state.currentJobId === tempId ? realId : state.currentJobId,
    }));
  },

  completeJob: async (id, sceneUrl) => {
    try {
      // Fetch Project by Generation ID to get the projectId for redirection
      const projectResponse = await fetch(`/api/projects?generationId=${id}`);
      if (!projectResponse.ok) {
        throw new Error(`Failed to fetch project: ${projectResponse.status}`);
      }

      const { projects } = await projectResponse.json();
      const project = projects?.[0];

      if (!project) {
        throw new Error("Project not found linked to this generation");
      }

      const projectId = project.id;
      const finalSceneUrl = sceneUrl || `/projects/${projectId}`;

      set((state) => ({
        isGenerating: false,
        generationStep: null,
        jobs: state.jobs.map((job) =>
          job.id === id
            ? {
                ...job,
                progress: 100,
                message: "Generation complete",
                status: "complete",
                currentStep: job.totalSteps,
                sceneUrl: finalSceneUrl,
              }
            : job,
        ),
      }));
    } catch (error) {
      console.error("Error completing job:", error);
      get().failJob(id, "Failed to complete generation");
    }
  },

  failJob: (id, message) => {
    set((state) => ({
      isGenerating: false,
      generationStep: null,
      jobs: state.jobs.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "error",
              message: message ?? "Generation failed",
            }
          : job,
      ),
    }));
  },

  setCurrentJobId: (id) => {
    set({ currentJobId: id });
  },

  clearGenerationStep: () => {
    set({ generationStep: null });
  },
}));
