"use client";

import { useEffect } from "react";
import { useVideoGenerationStore } from "@/stores/video-generation-store";
import {
  usePollGenerationProgress,
  GenerationProgress,
} from "@/hooks/use-poll-generation-progress";

export const useGenerationPoller = () => {
  const jobs = useVideoGenerationStore((state) => state.jobs);
  const updateJobProgress = useVideoGenerationStore((state) => state.updateJobProgress);
  const completeJob = useVideoGenerationStore((state) => state.completeJob);
  const failJob = useVideoGenerationStore((state) => state.failJob);

  // Filter for jobs that are currently generating
  const generatingJobIds = jobs
    .filter((job) => job.status === "generating" && !job.id.startsWith("temp_"))
    .map((job) => job.id);

  const { progressesById } = usePollGenerationProgress(generatingJobIds);

  useEffect(() => {
    Object.entries(progressesById).forEach(([id, progressData]: [string, GenerationProgress]) => {
      // Find the job to see if we need to update
      const job = jobs.find((j) => j.id === id);
      if (!job || job.status !== "generating") return;

      if (progressData.status === "COMPLETED") {
        completeJob(id, `/p/${id}`);
      } else if (progressData.status === "FAILED") {
        failJob(id, "Generation failed");
      } else if (progressData.status === "PENDING" || progressData.status === "PROGRESS") {
        // Only update if progress or message has changed to avoid infinite loop
        const hasChanged = job.progress !== progressData.progress;

        if (hasChanged) {
          updateJobProgress(id, {
            current: 2,
            total: 2,
            message: "Generating video...",
            progress: progressData.progress,
          });
        }
      }
    });
  }, [progressesById, updateJobProgress, completeJob, failJob, jobs]);
};
