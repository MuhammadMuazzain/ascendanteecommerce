import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const POLL_INTERVAL = 2000; // 2 sec

// FIXME: Remove once progress is actually working on inference
const isEnabled = true;

export interface GenerationProgress {
  id: string;
  status: "PENDING" | "PROGRESS" | "COMPLETED" | "FAILED" | "CANCELED";
  progress: number;
}

async function fetchGenerationProgress(id: string): Promise<GenerationProgress> {
  const response = await fetch(`/api/resolve-schema/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generation progress");
  }
  const data = await response.json();
  return {
    id: id,
    status: data.status,
    progress: data.progress || 0,
  };
}

export const usePollGenerationProgress = (generationIds: string[]) => {
  const { data, isLoading } = useQuery({
    queryKey: ["generation-progress", generationIds],
    queryFn: async () => {
      // Fetch all progresses in parallel
      const promises = generationIds.map((id) => fetchGenerationProgress(id).catch(() => null));
      const results = await Promise.all(promises);
      return results.filter((r): r is GenerationProgress => r !== null);
    },
    enabled: generationIds.length > 0 && isEnabled,
    refetchInterval: (query) => {
      // Stop polling if all completed or failed
      const allFinished = query.state.data?.every(
        (p) => p.status === "COMPLETED" || p.status === "FAILED" || p.status === "CANCELED",
      );
      return allFinished ? false : POLL_INTERVAL;
    },
  });

  const progressesById = useMemo(() => {
    return (data || []).reduce<Record<string, GenerationProgress>>((acc, progress) => {
      acc[progress.id] = progress;
      return acc;
    }, {});
  }, [data]);

  return {
    progressesById,
    isLoading,
  };
};
