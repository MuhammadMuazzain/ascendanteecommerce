"use client";

import { Loader2 } from "lucide-react";
import { useProjects } from "@/hooks/use-projects";

export function GenerationProgressBanner({ generationId }: { generationId: string }) {
  const { data: projects = [] } = useProjects();
  const activeProject = projects.find((p: any) => p.generationId === generationId);

  if (!activeProject || activeProject.status === "COMPLETED") return null;

  const statusMsg = activeProject?.generationMetadata?.message || "Generating your video...";
  const tasks: Array<{ key: string; label: string; status: "pending" | "active" | "completed" }> =
    activeProject?.generationMetadata?.tasks ?? [];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex-none border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
      <span className="text-sm text-foreground font-medium truncate flex-1">{statusMsg}</span>
      {totalTasks > 0 && (
        <>
          <div className="w-32 shrink-0 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-9 text-right">
            {progressPercent}%
          </span>
        </>
      )}
    </div>
  );
}
