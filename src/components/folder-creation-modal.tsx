"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "./shared/icons";
import { useCreateFolder } from "@/hooks/use-folders";

interface FolderCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FolderCreationModal({ open, onOpenChange }: FolderCreationModalProps) {
  const [folderName, setFolderName] = useState("");
  const createFolder = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      return;
    }

    try {
      await createFolder.mutateAsync(folderName.trim());
      setFolderName("");
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    setFolderName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="folder-name"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Folder Name
            </label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              disabled={createFolder.isPending}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createFolder.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createFolder.isPending}>
              {createFolder.isPending ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
