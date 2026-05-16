"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalProjects: number;
  completedGenerations: number;
  failedGenerations: number;
  recentUsers: { count: string; date: string }[];
  recentGenerations: { count: string; date: string }[];
}

const userChartConfig = {
  users: { label: "New Users", color: "hsl(220 70% 60%)" },
};

const genChartConfig = {
  generations: { label: "Generations", color: "hsl(270 70% 60%)" },
};

const PIE_COLORS = ["hsl(140 60% 50%)", "hsl(0 60% 55%)", "hsl(220 60% 60%)"];

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generationBreakdown = stats
    ? [
        { name: "Completed", value: stats.completedGenerations },
        { name: "Failed", value: stats.failedGenerations },
        {
          name: "Other",
          value: Math.max(
            0,
            stats.totalGenerations - stats.completedGenerations - stats.failedGenerations,
          ),
        },
      ]
    : [];

  const successRate =
    stats && stats.totalGenerations > 0
      ? Math.round((stats.completedGenerations / stats.totalGenerations) * 100)
      : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compact Header Bar */}
      <div className="h-11 flex items-center px-4 bg-background/80 backdrop-blur-3xl justify-between text-xs font-semibold border-b sticky top-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-2">
          <span className="">Analytics</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* New Users Chart */}
          <Card className="rounded-sm border-border/50 shadow-none">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New Users (30d)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ChartContainer config={userChartConfig} className="h-52 w-full">
                  <BarChart
                    data={stats?.recentUsers.map((u) => ({
                      date: u.date.slice(5),
                      users: Number(u.count),
                    }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="users" fill={userChartConfig.users.color} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Generations Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generations (30d)</CardTitle>
              <CardDescription>Daily video generations</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : (
                <ChartContainer config={genChartConfig} className="h-52 w-full">
                  <LineChart
                    data={stats?.recentGenerations.map((g) => ({
                      date: g.date.slice(5),
                      generations: Number(g.count),
                    }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="generations"
                      stroke={genChartConfig.generations.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Generation Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation Status Breakdown</CardTitle>
              <CardDescription>All-time distribution of generation outcomes</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              {loading ? (
                <Skeleton className="h-44 w-44 rounded-full mx-auto" />
              ) : (
                <>
                  <ChartContainer
                    config={{
                      completed: { label: "Completed", color: PIE_COLORS[0] },
                      failed: { label: "Failed", color: PIE_COLORS[1] },
                      other: { label: "Other", color: PIE_COLORS[2] },
                    }}
                    className="h-44 w-44 shrink-0"
                  >
                    <PieChart>
                      <Pie
                        data={generationBreakdown}
                        dataKey="value"
                        innerRadius={36}
                        outerRadius={64}
                        strokeWidth={2}
                        stroke="var(--background)"
                      >
                        {generationBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-3">
                    {generationBreakdown.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i] }}
                        />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="ml-auto text-sm font-medium pl-4">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Key Metric: Success Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Success Rate</CardTitle>
              <CardDescription>
                Percentage of generations that completed successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              {loading ? (
                <Skeleton className="h-20 w-32" />
              ) : (
                <>
                  <p
                    className="text-6xl font-bold tracking-tight"
                    style={{
                      color:
                        successRate >= 80
                          ? "hsl(140 60% 50%)"
                          : successRate >= 50
                            ? "hsl(40 80% 55%)"
                            : "hsl(0 60% 55%)",
                    }}
                  >
                    {successRate}%
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    {stats?.completedGenerations.toLocaleString()} of{" "}
                    {stats?.totalGenerations.toLocaleString()} generations succeeded
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
