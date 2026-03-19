import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HealthLog } from "@shared/schema";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { Activity, TrendingUp } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

const METRIC_GROUPS = {
  sleep: {
    title: "Sleep",
    metrics: [
      { key: "sleepHours", label: "Hours", color: "hsl(240, 50%, 55%)", unit: "hrs" },
      { key: "sleepQuality", label: "Quality (1-5)", color: "hsl(260, 50%, 60%)", unit: "" },
    ],
  },
  nutrition: {
    title: "Nutrition",
    metrics: [
      { key: "calories", label: "Calories", color: "hsl(25, 80%, 55%)", unit: "kcal" },
      { key: "protein", label: "Protein", color: "hsl(15, 70%, 50%)", unit: "g" },
      { key: "water", label: "Water", color: "hsl(200, 60%, 50%)", unit: "L" },
    ],
  },
  fitness: {
    title: "Fitness",
    metrics: [
      { key: "steps", label: "Steps", color: "hsl(152, 45%, 40%)", unit: "" },
      { key: "exerciseMinutes", label: "Exercise", color: "hsl(170, 50%, 45%)", unit: "min" },
    ],
  },
  vitals: {
    title: "Vitals",
    metrics: [
      { key: "weight", label: "Weight", color: "hsl(35, 70%, 50%)", unit: "lbs" },
      { key: "heartRate", label: "Heart Rate", color: "hsl(0, 60%, 50%)", unit: "bpm" },
    ],
  },
  wellness: {
    title: "Wellness",
    metrics: [
      { key: "mood", label: "Mood", color: "hsl(280, 50%, 55%)", unit: "" },
      { key: "energyLevel", label: "Energy", color: "hsl(45, 70%, 50%)", unit: "" },
      { key: "stressLevel", label: "Stress", color: "hsl(0, 60%, 55%)", unit: "" },
    ],
  },
};

function computeStats(logs: HealthLog[], key: string) {
  const values = logs
    .map((l) => Number((l as any)[key]))
    .filter((v) => !isNaN(v) && v !== 0);
  if (values.length === 0) return null;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { avg: avg.toFixed(1), min: min.toFixed(1), max: max.toFixed(1), count: values.length };
}

export default function Trends() {
  const [rangeDays, setRangeDays] = useState(30);
  const today = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), rangeDays), "yyyy-MM-dd");

  const { data: logs, isLoading } = useQuery<HealthLog[]>({
    queryKey: ["/api/health-logs/range", `?start=${startDate}&end=${today}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/health-logs/range?start=${startDate}&end=${today}`);
      return res.json();
    },
  });

  const chartData = logs?.slice().sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]" data-testid="trends-page">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Trends</h1>
          <p className="text-sm text-muted-foreground">Track your health over time</p>
        </div>
        <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
          <SelectTrigger className="w-28" data-testid="select-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-md" />
          ))}
        </div>
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base font-medium mb-1">No data in this range</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Start logging daily to see trends appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="sleep">
          <TabsList className="flex flex-wrap">
            {Object.entries(METRIC_GROUPS).map(([key, group]) => (
              <TabsTrigger key={key} value={key} data-testid={`trends-tab-${key}`}>
                {group.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(METRIC_GROUPS).map(([groupKey, group]) => (
            <TabsContent key={groupKey} value={groupKey} className="space-y-4 mt-4">
              {group.metrics.map((metric) => {
                const stats = computeStats(chartData, metric.key);
                return (
                  <Card key={metric.key}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                      <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                      {stats && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            avg {stats.avg}{metric.unit ? ` ${metric.unit}` : ""}
                          </Badge>
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {stats.min} - {stats.max}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        {groupKey === "fitness" ? (
                          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(v) => format(parseISO(v), "M/d")}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                              labelFormatter={(v) => format(parseISO(v as string), "MMM d, yyyy")}
                            />
                            <Bar dataKey={metric.key} fill={metric.color} radius={[3, 3, 0, 0]} />
                          </BarChart>
                        ) : (
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(v) => format(parseISO(v), "M/d")}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                            <Tooltip
                              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                              labelFormatter={(v) => format(parseISO(v as string), "MMM d, yyyy")}
                            />
                            <Line
                              type="monotone"
                              dataKey={metric.key}
                              stroke={metric.color}
                              strokeWidth={2}
                              dot={{ r: 3, fill: metric.color }}
                              connectNulls
                            />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
