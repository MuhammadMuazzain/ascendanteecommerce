import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  generationId: string | null;
  sceneId: string | null;
  folderId: string | null;
  user_id: string;
  description: string | null;
  thumbnail: string | null;
  public: boolean;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  status?: "COMPLETED" | "FAILED" | "PENDING" | "PROGRESS" | "CANCELED" | "completed";
  generationMetadata?: any;
}

interface FetchProjectsParams {
  folderId?: string | null;
}

async function fetchProjects(params?: FetchProjectsParams): Promise<Project[]> {
  let url = "/api/projects";
  const searchParams = new URLSearchParams();

  if (params?.folderId === null || params?.folderId === "") {
    searchParams.set("folderId", "null");
  } else if (params?.folderId) {
    searchParams.set("folderId", params.folderId);
  }

  if (searchParams.toString()) {
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch projects");
  }
  const data = await response.json();
  return data.projects || [];
}

async function fetchPublicProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects/public");
  if (!response.ok) {
    throw new Error("Failed to fetch public projects");
  }
  const data = await response.json();
  return data.projects || [];
}

async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch project");
  }
  const data = await response.json();
  return data.project;
}

async function updateProject(
  id: string,
  updates: {
    name?: string;
    description?: string;
    folderId?: string | null;
    public?: boolean;
  },
): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update project");
  }

  const data = await response.json();
  return data.project;
}

async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete project");
  }
}

export function useProjects(folderId?: string | null) {
  return useQuery({
    queryKey: ["projects", folderId],
    queryFn: () => fetchProjects({ folderId }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasActiveProjects = data.some((p) => p.status === "PENDING" || p.status === "PROGRESS");

      return hasActiveProjects ? 2000 : false;
    },
  });
}

export function usePublicProjects() {
  return useQuery({
    queryKey: ["public-projects"],
    queryFn: fetchPublicProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const isActive = data.status === "PENDING" || data.status === "PROGRESS";
      return isActive ? 2000 : false;
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      description?: string;
      folderId?: string | null;
      public?: boolean;
    }) => updateProject(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.setQueryData(["projects", data.id], data);
      toast.success("Project updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update project");
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });
}
