"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface RenameProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newName: string) => void;
  isRenaming?: boolean;
  currentName?: string;
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  onConfirm,
  isRenaming,
  currentName = "",
}: RenameProjectDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name !== currentName) {
      onConfirm(name.trim());
    } else if (name === currentName) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>Enter a new name for your project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isRenaming}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isRenaming || !name.trim()}>
              {isRenaming && <Spinner data-icon="inline-start" className="mr-2 h-4 w-4" />}
              {isRenaming ? "Renaming…" : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
