"use client";

import { useState } from "react";
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

interface DeleteDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteDataModal({ open, onOpenChange, onConfirmDelete }: DeleteDataModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText.toLowerCase() === "delete my data";

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setConfirmText("");
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Delete All Projects & Data</DialogTitle>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete all your projects, schemas,
            scenes, assets, and generations from our servers. Your account and active subscriptions
            will remain intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <p className="text-sm">
            Type <span className="font-mono font-semibold">delete my data</span> to confirm
          </p>
          <Input
            type="text"
            placeholder="delete my data"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
