"use client";

import { useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSchemaStore } from "@/stores/schema-store";
import { Loader2, AlertCircle } from "lucide-react";
import WorkflowLayout from "@/components/workflow/workflow-layout";
import { useProjectInit } from "@/hooks/use-project-init";

interface StoryboardPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryboardPage({ params }: StoryboardPageProps) {
  const { id: generationId } = use(params);
  const router = useRouter();
  const { isGenerating } = useSchemaStore();

  const prevIsGeneratingRef = useRef(false);

  const { fetchByGenerationId, isLoading, error } = useProjectInit({ generationId });

  useEffect(() => {
    if (!generationId) return;

    // Always fetch immediately on mount / when generationId changes
    fetchByGenerationId(generationId);

    // Set up polling — interval re-created whenever isGenerating changes
    if (isGenerating) {
      const interval = setInterval(() => {
        fetchByGenerationId(generationId, true);
      }, 3000);
      prevIsGeneratingRef.current = true;
      return () => clearInterval(interval);
    }

    // When transitioning from generating → done, do one final guaranteed fetch
    // with a short delay so the DB write has fully settled.
    if (prevIsGeneratingRef.current && !isGenerating) {
      prevIsGeneratingRef.current = false;
      const t = setTimeout(() => fetchByGenerationId(generationId, true), 1500);
      return () => clearTimeout(t);
    }
  }, [generationId, fetchByGenerationId, isGenerating]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="max-w-md text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => router.push("/script-to-video?mode=ugc-video-ad")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Back to Creator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background flex-col">
      <WorkflowLayout />
    </div>
  );
}
