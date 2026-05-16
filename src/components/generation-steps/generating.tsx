"use client";

import { ArrowLeftIcon, PlayIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

interface GeneratingProps {
  generationStep?: {
    current: number;
    total: number;
    message: string;
  } | null;
  isGenerating?: boolean;
  completedSchemeId?: string | null;
}

export function Generating({ generationStep, isGenerating, completedSchemeId }: GeneratingProps) {
  const router = useRouter();

  const isComplete = completedSchemeId !== null && !isGenerating;

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        {generationStep && !isComplete && (
          <div className="mb-6">
            <div className="flex justify-between text-muted-foreground mb-4 text-xl font-semibold">
              <span>We're creating your video, it's going to take about a minute...</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 mb-3">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(generationStep.current / generationStep.total) * 100}%`,
                }}
              />
            </div>
            {generationStep.message && (
              <p className="text-sm text-muted-foreground">{generationStep.message}</p>
            )}
          </div>
        )}

        {isComplete ? (
          <div className="space-y-4">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">Video Created Successfully!</h2>
              <p className="text-muted-foreground">
                Your video is ready. What would you like to do next?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button className="w-full" onClick={() => router.push(`/p/${completedSchemeId}`)}>
                <PlayIcon className="mr-2" />
                Preview Video
              </Button>
              <Button variant="secondary" onClick={() => router.push("/home")} className="w-full">
                <ArrowLeftIcon className="mr-2" />
                Go to Home
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="rounded-full h-12 w-40"
            variant="secondary"
            onClick={() => router.push("/home")}
          >
            <ArrowLeftIcon />
            Back to home
          </Button>
        )}
      </div>
    </div>
  );
}
