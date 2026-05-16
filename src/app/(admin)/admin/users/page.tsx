"use client";

import { cn } from "@/lib/utils";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string | null;
  email_verified: boolean;
  created_at: string;
  plan: string | null;
  credits: number | null;
  subscription_status: string | null;
}

interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
}

function PlanStatus({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-muted-foreground text-xs">—</span>;
  const isFree = plan.toLowerCase() === "free";
  return (
    <div className="flex items-center gap-2">
      <div className={`size-1.5 rounded-full ${isFree ? "bg-muted-foreground" : "bg-amber-500"}`} />
      <span className="text-[13px] font-medium capitalize">{plan.toLowerCase()}</span>
    </div>
  );
}

function VerifiedStatus({ verified }: { verified: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-1.5 rounded-full ${verified ? "bg-green-500" : "bg-muted-foreground"}`}
      />
      <span className="text-[13px] font-medium">{verified ? "Verified" : "Unverified"}</span>
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

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="flex-1 overflow-y-auto bg-card">
      {/* Compact Header Bar */}
      <div className="h-14 flex items-center px-4 bg-card backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Users</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => fetchUsers()}
          disabled={loading}
        >
          <RefreshCcw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Toolbar Row */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border/50 rounded-sm"
            />
          </div>

          <div className="flex items-center gap-2 px-2 h-8 bg-muted/40 border-border/50 rounded-sm">
            <Filter className="size-3 text-muted-foreground" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32 border-0 bg-transparent h-7 text-xs focus:ring-0">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All Plans
                </SelectItem>
                <SelectItem value="free" className="text-xs">
                  Free
                </SelectItem>
                <SelectItem value="pro" className="text-xs">
                  Pro
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
                {data.total.toLocaleString()} total
              </span>
            )}
          </div>
        </div>

        <Card className="rounded-sm border-border/50 shadow-none overflow-hidden bg-card">
          <CardContent className="p-0">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr] px-4 py-2 bg-muted/20 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div>User</div>
                <div>Plan</div>
                <div>Credits</div>
                <div>Role</div>
                <div>Verification</div>
                <div className="text-right">Joined</div>
              </div>

              <div className="divide-y divide-border/40">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr] px-4 py-4 items-center"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex justify-end">
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    ))
                  : data?.users.map((user) => (
                      <div
                        key={user.id}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr] px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-8 border border-border/50">
                            <AvatarImage src={user.image || ""} alt={user.name || ""} />
                            <AvatarFallback className="text-[10px] font-bold">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold tracking-tight truncate">
                              {user.name || (
                                <span className="text-muted-foreground font-normal italic">
                                  No name set
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <PlanStatus plan={user.plan} />
                          <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tighter font-mono">
                            {user.subscription_status || "no subscription"}
                          </div>
                        </div>

                        <div className="text-[13px] font-mono text-muted-foreground">
                          {user.credits?.toLocaleString() ?? "0"}
                        </div>

                        <div>
                          <Select
                            value={user.role || "viewer"}
                            onValueChange={(val) => handleRoleChange(user.id, val)}
                            disabled={updating === user.id}
                          >
                            <SelectTrigger className="w-24 h-7 text-xs border-border/50 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="editor"
                                className="text-xs font-semibold text-green-500"
                              >
                                Editor
                              </SelectItem>
                              <SelectItem value="viewer" className="text-xs">
                                Viewer
                              </SelectItem>
                              <SelectItem value="guest" className="text-xs text-muted-foreground">
                                Guest
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <VerifiedStatus verified={user.email_verified} />
                        </div>

                        <div className="text-right text-[12px] text-muted-foreground">
                          {formatRelativeTime(user.created_at)}
                        </div>
                      </div>
                    ))}
              </div>
            </div>

            {/* Pagination */}
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
