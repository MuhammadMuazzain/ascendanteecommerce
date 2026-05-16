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

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText.toLowerCase() === "delete my account";

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
          <DialogTitle className="text-xl">Delete Account</DialogTitle>
          <DialogDescription className="pt-2">
            This action cannot be undone. This will permanently delete your account and remove your
            data from our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <p className="text-sm">
            Type <span className="font-mono font-semibold">delete my account</span> to confirm
          </p>
          <Input
            type="text"
            placeholder="delete my account"
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
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
