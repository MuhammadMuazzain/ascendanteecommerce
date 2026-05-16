import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Folder {
  id: string;
  name: string;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
}

async function fetchFolders(): Promise<Folder[]> {
  const response = await fetch("/api/folders");
  if (!response.ok) {
    throw new Error("Failed to fetch folders");
  }
  const data = await response.json();
  return data.folders || [];
}

async function createFolder(name: string): Promise<Folder> {
  const response = await fetch("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create folder");
  }

  const data = await response.json();
  return data.folder;
}

async function updateFolder(id: string, name: string): Promise<Folder> {
  const response = await fetch(`/api/folders/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update folder");
  }

  const data = await response.json();
  return data.folder;
}

async function deleteFolder(id: string): Promise<void> {
  const response = await fetch(`/api/folders/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete folder");
  }
}

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create folder");
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateFolder(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update folder");
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete folder");
    },
  });
}
