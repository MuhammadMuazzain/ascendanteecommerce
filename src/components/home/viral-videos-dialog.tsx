"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ViralVideosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViralVideosDialog({ open, onOpenChange }: ViralVideosDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (!url.includes("kalodata.com/product/detail")) {
      setError("Please enter a valid Kalodata product detail URL.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kalodata-videos/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start analysis");
      }

      toast.success("Analysis started successfully!");
      onOpenChange(false);
      router.push(`/viral-videos/${data.generationId}`);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      toast.error("Failed to start analysis");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border-border shadow-2xl">
        <div className="relative h-32 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary-rgb),0.1),transparent)]" />
          <div className="relative p-4 rounded-2xl bg-card border border-border shadow-md">
            <Sparkles className="size-8 text-primary animate-pulse" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Viral Video Discovery
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Paste a Kalodata product URL below to analyze trending viral videos and performance
              metrics in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="url"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Product URL
              </Label>
              <div className="relative group">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="url"
                  placeholder="https://www.kalodata.com/product/detail?id=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  className="pl-10 h-12 bg-muted/30 border-border focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all rounded-lg"
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-xs font-medium mt-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="size-3" />
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading || !url}
              className="h-12 w-full font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] rounded-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing Trends...
                </>
              ) : (
                "Start Viral Analysis"
              )}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium">
              Powered by Kalodata & Stagehand AI
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
