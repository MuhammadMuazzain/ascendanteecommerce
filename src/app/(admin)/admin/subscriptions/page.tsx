"use client";

import { cn } from "@/lib/utils";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Filter, RefreshCcw, ArrowUpDown } from "lucide-react";
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

interface SubscriptionRow {
  id: string;
  plan: string;
  status: string | null;
  credits: number | null;
  period_start: string | null;
  period_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface SubsResponse {
  subscriptions: SubscriptionRow[];
  total: number;
  page: number;
  totalPages: number;
}

const PLAN_FILTERS = [
  { value: "", label: "All Plans" },
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];

function StatusDot({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const isActive = status === "active";
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-muted-foreground"}`}
      />
      <span className="text-[13px] font-medium capitalize">{status.toLowerCase()}</span>
    </div>
  );
}

function PlanStatus({ plan }: { plan: string }) {
  const isFree = plan.toLowerCase() === "free";
  return (
    <div className="flex items-center gap-2">
      <div className={`size-1.5 rounded-full ${isFree ? "bg-muted-foreground" : "bg-amber-500"}`} />
      <span className="text-[13px] font-medium capitalize">{plan.toLowerCase()}</span>
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
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState("");

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (plan) params.set("plan", plan);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, plan]);

  useEffect(() => {
    setPage(1);
  }, [plan]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compact Header Bar */}
      <div className="h-14 flex items-center px-4 bg-card backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Subscriptions</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => fetchSubs()}
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
            <Select value={plan || "all"} onValueChange={(v) => setPlan(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_FILTERS.map((f) => (
                  <SelectItem key={f.value || "all"} value={f.value || "all"} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <RefreshCcw className="size-3 text-muted-foreground" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Statuses
                </SelectItem>
                <SelectItem value="active" className="text-xs">
                  Active
                </SelectItem>
                <SelectItem value="canceled" className="text-xs">
                  Canceled
                </SelectItem>
                <SelectItem value="past_due" className="text-xs">
                  Past Due
                </SelectItem>
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

          <div className="ml-auto">
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
              {/* Header Row */}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] px-4 py-2 bg-muted/20 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div>User</div>
                <div>Plan / Status</div>
                <div>Credits</div>
                <div>Period</div>
                <div className="text-right">Stripe ID / Created</div>
              </div>

              <div className="divide-y divide-border/40">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] px-4 py-4 items-center"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex justify-end">
                          <Skeleton className="h-4 w-36" />
                        </div>
                      </div>
                    ))
                  : data?.subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold tracking-tight truncate">
                            {sub.user_name || "Unknown"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5">
                            {sub.user_email}
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <PlanStatus plan={sub.plan} />
                          <StatusDot status={sub.status} />
                        </div>

                        <div className="text-[13px] font-mono text-muted-foreground">
                          {sub.credits?.toLocaleString() ?? "—"}
                        </div>

                        <div className="text-[12px] text-muted-foreground">
                          <p>{formatDate(sub.period_start)}</p>
                          <p className="text-[10px] opacity-70">to {formatDate(sub.period_end)}</p>
                        </div>

                        <div className="text-right min-w-0">
                          {sub.stripe_subscription_id ? (
                            <p className="text-[11px] font-mono text-muted-foreground mb-0.5 truncate">
                              {sub.stripe_subscription_id}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic mb-0.5">
                              No Stripe ID
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground uppercase opacity-70 tracking-tighter">
                            {formatRelativeTime(sub.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {data.page} of {data.totalPages}
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
