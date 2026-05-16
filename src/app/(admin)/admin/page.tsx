"use client";

import { useEffect, useState } from "react";
import { Users, Clapperboard, FolderOpen, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalProjects: number;
  completedGenerations: number;
  failedGenerations: number;
  recentUsers: { count: string; date: string }[];
  recentGenerations: { count: string; date: string }[];
}

const statCards = (stats: Stats) => [
  {
    label: "Total Users",
    value: stats.totalUsers.toLocaleString(),
    icon: Users,
    color: "text-foreground",
    bg: "bg-muted",
  },
  {
    label: "Total Generations",
    value: stats.totalGenerations.toLocaleString(),
    icon: Clapperboard,
    color: "text-foreground",
    bg: "bg-muted",
  },
  {
    label: "Total Projects",
    value: stats.totalProjects.toLocaleString(),
    icon: FolderOpen,
    color: "text-foreground",
    bg: "bg-muted",
  },
  {
    label: "Completed",
    value: stats.completedGenerations.toLocaleString(),
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Failed",
    value: stats.failedGenerations.toLocaleString(),
    icon: XCircle,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    label: "Success Rate",
    value:
      stats.totalGenerations > 0
        ? `${Math.round((stats.completedGenerations / stats.totalGenerations) * 100)}%`
        : "—",
    icon: TrendingUp,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const chartConfig = {
  users: { label: "Users", color: "var(--color-primary, hsl(var(--primary)))" },
  generations: { label: "Generations", color: "var(--color-chart-2, hsl(var(--chart-2)))" },
};

function mergeChartData(
  users: { count: string; date: string }[],
  generations: { count: string; date: string }[],
) {
  const map: Record<string, { date: string; users: number; generations: number }> = {};
  for (const u of users) {
    map[u.date] = { date: u.date, users: Number(u.count), generations: 0 };
  }
  for (const g of generations) {
    if (map[g.date]) {
      map[g.date].generations = Number(g.count);
    } else {
      map[g.date] = { date: g.date, users: 0, generations: Number(g.count) };
    }
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error(data.error);
        } else {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData =
    stats && stats.recentUsers && stats.recentGenerations
      ? mergeChartData(stats.recentUsers, stats.recentGenerations)
      : [];

  return (
    <div className="flex-1 overflow-y-auto bg-card">
      {/* Compact Header Bar */}
      <div className="h-14 flex items-center px-4 bg-card backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          {loading ? <Skeleton className="h-4 w-20" /> : <span className="">Dashboard</span>}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-sm border-border/50">
                  <CardContent className="p-3">
                    <Skeleton className="h-6 w-12 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </CardContent>
                </Card>
              ))
            : stats &&
              statCards(stats).map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.label}
                    className="rounded-sm border-border/50 hover:bg-muted/30 transition-colors shadow-none"
                  >
                    <CardContent className="p-3 font-mono">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
                          {card.label}
                        </p>
                        <Icon className={cn("size-3.5", card.color)} />
                      </div>
                      <p className="text-xl font-bold tracking-tight">{card.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity (Last 30 Days)</CardTitle>
            <CardDescription>New users and generations per day</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke={chartConfig.users.color}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="generations"
                    stroke={chartConfig.generations.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
