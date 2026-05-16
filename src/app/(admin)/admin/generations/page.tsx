"use client";

import { cn } from "@/lib/utils";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Filter, RefreshCcw, Calendar, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface GenerationRow {
  id: string;
  status: string;
  progress: number | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface GenerationsResponse {
  generations: GenerationRow[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "Completed", color: "bg-green-500" },
  FAILED: { label: "Failed", color: "bg-red-500" },
  PENDING: { label: "Pending", color: "bg-blue-500" },
  PROGRESS: { label: "Processing", color: "bg-amber-500" },
  CANCELED: { label: "Canceled", color: "bg-muted-foreground" },
};

function StatusDot({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted-foreground" };
  return (
    <div className="flex items-center gap-2">
      <div className={`size-1.5 rounded-full ${config.color}`} />
      <span className="text-[13px] font-medium capitalize">{config.label.toLowerCase()}</span>
    </div>
  );
}

function formatRelativeTime(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffInMs = now.getTime() - then.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return "just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ALL_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROGRESS", label: "In Progress" },
  { value: "CANCELED", label: "Canceled" },
];

export default function AdminGenerationsPage() {
  const [data, setData] = useState<GenerationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/generations?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  return (
    <div className="flex-1 overflow-y-auto bg-card">
      {/* Compact Header Bar */}
      <div className="h-14 flex items-center px-4 bg-card backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Generations</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => fetchGenerations()}
          disabled={loading}
        >
          <RefreshCcw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Toolbar Row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <Filter className="size-3 text-muted-foreground" />
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s.value || "all"} value={s.value || "all"} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <ArrowUpDown className="size-3 text-muted-foreground" />
            <Select defaultValue="desc">
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc" className="text-xs">
                  Newest
                </SelectItem>
                <SelectItem value="asc" className="text-xs">
                  Oldest
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <Calendar className="size-3 text-muted-foreground" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Time
                </SelectItem>
                <SelectItem value="24h" className="text-xs">
                  Last 24h
                </SelectItem>
                <SelectItem value="7d" className="text-xs">
                  Last 7d
                </SelectItem>
                <SelectItem value="30d" className="text-xs">
                  Last 30d
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {data && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight bg-muted/40 px-2 py-1 rounded-sm border border-border/50">
                {data.total.toLocaleString()} records
              </span>
            )}
          </div>
        </div>

        <Card className="rounded-sm border-border/50 shadow-none overflow-hidden bg-card">
          <CardContent className="p-0">
            <div className="min-w-[800px]">
              {/* Header Row (Optional, but using subtle one for clarity) */}
              <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_1fr] px-4 py-2 bg-muted/20 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div>Deployment / ID</div>
                <div>Status</div>
                <div>Progress</div>
                <div>Created</div>
                <div className="text-right">User</div>
              </div>

              <div className="divide-y divide-border/40">
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_1fr] px-4 py-4 items-center"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </div>
                    ))
                  : data?.generations.map((gen) => (
                      <div
                        key={gen.id}
                        className="grid grid-cols-[1.5fr_1fr_1.2fr_1fr_1fr] px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[13px] tracking-tight truncate">
                              {gen.id.slice(0, 12)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1 font-mono font-normal"
                            >
                              Production
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono">{gen.id}</span>
                          </div>
                        </div>

                        <div>
                          <StatusDot status={gen.status} />
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {formatRelativeTime(gen.updated_at)}
                          </div>
                        </div>

                        <div className="pr-8">
                          <div className="flex flex-col gap-1.5">
                            <Progress
                              value={gen.progress ?? 0}
                              className="h-1 flex-1 bg-muted/50"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                              <span>{Math.round(gen.progress ?? 0)}%</span>
                              <span>{gen.status.toLowerCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[12px] text-muted-foreground">
                          {formatRelativeTime(gen.created_at)}
                        </div>

                        <div className="flex items-center justify-end gap-2.5">
                          <div className="text-right min-w-0">
                            <p className="text-[12px] font-medium truncate max-w-[120px]">
                              {gen.user_name || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {gen.user_email}
                            </p>
                          </div>
                          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(gen.user_name || gen.user_email || "U").charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {data.page} of {data.totalPages} ({data.total.toLocaleString()} total)
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-7"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
