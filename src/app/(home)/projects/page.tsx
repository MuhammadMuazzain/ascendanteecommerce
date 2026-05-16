"use client";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/components/ui/sidebar";
import { useProjects, useDeleteProject, useUpdateProject } from "@/hooks/use-projects";
import { useState, type CSSProperties } from "react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { RenameProjectDialog } from "@/components/rename-project-dialog";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Trash2, MoreVertical, Eye, Pencil, Share2, FileEdit, Loader2Icon } from "lucide-react";
import ScenifyIcon from "@/components/logos/scenify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
function ProjectProgress({ project }: { project: any }) {
  const statusText = project.generationMetadata?.message || project.status || "Starting...";
  let progressDisplay = statusText;

  if (project.generationMetadata?.tasks?.length) {
    const tasks = project.generationMetadata.tasks;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    const total = tasks.length;

    // Only show fractions if it's not fully done (completed !== total prevents "Done! (9/9)")
    if (completed < total) {
      progressDisplay = `${statusText} (${completed}/${total})`;
    }
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 z-10 flex whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%] justify-center overflow-x-hidden">
      <div className="text-xs font-medium text-primary bg-background/80 px-2 py-1 rounded-md shadow-sm truncate">
        {progressDisplay}
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: any;
  onDelete: (id: string) => void;
  onRename: (project: any) => void;
}

/** auto-fit stretches cards to fill the row (no empty column on the right) */
const PROJECTS_GRID_CLASS =
  "grid w-full grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6";

const ASPECT_RATIO_CSS: Record<string, string> = {
  "9:16": "9 / 16",
  "16:9": "16 / 9",
  "1:1": "1 / 1",
  "4:5": "4 / 5",
};

function projectAspectRatioStyle(aspectRatio?: string): CSSProperties {
  return { aspectRatio: ASPECT_RATIO_CSS[aspectRatio ?? ""] ?? "9 / 16" };
}

function ProjectCard({ project, onDelete, onRename }: ProjectCardProps) {
  const router = useRouter();
  const schemaId = project.schemas?.[0]?.id ?? "";
  const previewAspectStyle = projectAspectRatioStyle(project.aspectRatio);
  const handleClick = () => {
    if (project.generationId) {
      router.push(`/storyboard/${project.generationId}`);
      return;
    }
    console.log(project.type);
    if (project.type === "ai-copilot") {
      router.push(`/script-to-video/${project.id}`);
    } else if (project.type === "ai-editor") {
      router.push(`/edit/${project.generationId}`);
    } else {
      router.push(`/quick-edit/${schemaId}`);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // Placeholder for other actions
    if (action === "delete") {
      onDelete(project.id);
    } else if (action === "edit") {
      router.push(`/storyboard/${project.generationId}`);
    } else if (action === "rename") {
      onRename(project);
    } else {
      console.log(`Action ${action} triggered for project ${project.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col bg-card border border-border rounded-sm overflow-hidden transition-all duration-300 cursor-pointer",
        "hover:border-primary/50 hover:shadow-md",
      )}
    >
      {/* Preview frame matches video aspect ratio; full frame visible (no crop) */}
      <div className="relative w-full bg-muted overflow-hidden" style={previewAspectStyle}>
        {project.previewUrl || project.thumbnail ? (
          project.previewKind === "video" ||
          /\.(mp4|webm|mov)(\?|$)/i.test(project.previewUrl || project.thumbnail || "") ? (
            <video
              src={project.previewUrl || project.thumbnail}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <img
              src={project.previewUrl || project.thumbnail}
              alt={project.name}
              className="w-full h-full object-contain"
            />
          )
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-foreground/5">
            <ScenifyIcon className="w-20 h-auto opacity-10 text-foreground" />

            {project.status !== "COMPLETED" && (
              <>
                <Loader2Icon className="size-6 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                {project.generationId && <ProjectProgress project={project} />}
              </>
            )}
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-4 flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{project.name}</h3>
          <p className="text-xs text-muted-foreground">
            {project.createdAt
              ? formatDistanceToNow(new Date(project.createdAt), {
                  addSuffix: true,
                })
              : "Just now"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => handleAction(e, "preview")}>
              <Eye className="mr-2 w-4 h-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, "edit")}>
              <Pencil className="mr-2 w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, "rename")}>
              <FileEdit className="mr-2 w-4 h-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, "share")}>
              <Share2 className="mr-2 w-4 h-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => handleAction(e, "delete")}
            >
              <Trash2 className="mr-2 w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function Page() {
  const { open, isMobile, toggleSidebar } = useSidebar();
  const { data: projects = [], isLoading } = useProjects();
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();
  const { mutate: updateProject, isPending: isRenaming } = useUpdateProject();

  const [projectIdToDelete, setProjectIdToDelete] = useState<string | null>(null);
  const [projectToRename, setProjectToRename] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string) => {
    setProjectIdToDelete(id);
  };

  const handleRename = (project: any) => {
    setProjectToRename({ id: project.id, name: project.name });
  };

  const confirmDelete = () => {
    if (projectIdToDelete) {
      deleteProject(projectIdToDelete, {
        onSuccess: () => {
          setProjectIdToDelete(null);
        },
      });
    }
  };

  const confirmRename = (newName: string) => {
    if (projectToRename) {
      updateProject(
        { id: projectToRename.id, name: newName },
        {
          onSuccess: () => {
            setProjectToRename(null);
          },
        },
      );
    }
  };

  return (
    <main className="w-full h-screen flex-1 bg-card">
      <ScrollArea className="h-full">
        <div className="h-14 flex items-center p-4 bg-card/80 backdrop-blur-3xl justify-between text-sm font-medium border-b sticky top-0 z-10 transition-all duration-300">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button className="rounded-full" size="icon" variant="ghost" onClick={toggleSidebar}>
                <Icons.menu className="size-5" />
              </Button>
            )}
            Projects
          </div>
        </div>

        <div className="p-8 mx-auto">
          {isLoading ? (
            <div className={PROJECTS_GRID_CLASS}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-muted animate-pulse rounded-sm"
                  style={{ aspectRatio: "9 / 16" }}
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground mt-8 text-base space-y-2">
              <div className="py-2 text-stone-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M2.07 5.258C2 5.626 2 6.068 2 6.95v2.3h19.953c-.072-1.049-.256-1.737-.723-2.256a3 3 0 0 0-.224-.225C20.151 6 18.834 6 16.202 6h-.374c-1.153 0-1.73 0-2.268-.153a4 4 0 0 1-.848-.352C12.224 5.224 11.816 4.815 11 4l-.55-.55c-.274-.274-.41-.41-.554-.53a4 4 0 0 0-2.18-.903C7.53 2 7.336 2 6.95 2c-.883 0-1.324 0-1.692.07A4 4 0 0 0 2.07 5.257m19.928 5.492H2V14c0 3.771 0 5.657 1.172 6.828S6.229 22 10 22h4c3.771 0 5.657 0 6.828-1.172S22 17.771 22 14v-2.202z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="font-medium text-foreground">No projects yet</h3>
              <p className="mb-4">Create your first project to get started.</p>
            </div>
          ) : (
            <div className={PROJECTS_GRID_CLASS}>
              {projects.map((project: any) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <DeleteProjectDialog
        open={!!projectIdToDelete}
        onOpenChange={(open) => !open && setProjectIdToDelete(null)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      <RenameProjectDialog
        open={!!projectToRename}
        onOpenChange={(open) => !open && setProjectToRename(null)}
        onConfirm={confirmRename}
        isRenaming={isRenaming}
        currentName={projectToRename?.name}
      />
    </main>
  );
}
