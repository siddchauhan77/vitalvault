import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthLog, HealthGoal } from "@shared/schema";
import {
  Moon,
  Flame,
  Footprints,
  Droplets,
  Heart,
  Brain,
  Activity,
  Scale,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";

function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string | number | null;
  unit: string;
  icon: any;
  trend?: "up" | "down" | "flat";
  color: string;
}) {
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums">
                {value ?? "--"}
              </span>
              <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div className={`p-2 rounded-md ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500 dark:text-red-400" />}
            {trend === "flat" && <Minus className="w-3 h-3 text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniChart({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) => format(parseISO(v), "MMM d")}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            fontSize: 12,
          }}
          labelFormatter={(v) => format(parseISO(v as string), "MMM d, yyyy")}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${dataKey})`}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function getTrend(logs: HealthLog[], key: keyof HealthLog): "up" | "down" | "flat" | undefined {
  if (logs.length < 2) return undefined;
  const recent = logs.slice(0, 7);
  const older = logs.slice(7, 14);
  if (recent.length === 0 || older.length === 0) return undefined;
  const avgRecent = recent.reduce((s, l) => s + (Number(l[key]) || 0), 0) / recent.length;
  const avgOlder = older.reduce((s, l) => s + (Number(l[key]) || 0), 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (Math.abs(diff) < 0.01) return "flat";
  return diff > 0 ? "up" : "down";
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { data: logs, isLoading } = useQuery<HealthLog[]>({
    queryKey: ["/api/health-logs/range", `?start=${thirtyDaysAgo}&end=${today}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/health-logs/range?start=${thirtyDaysAgo}&end=${today}`);
      return res.json();
    },
  });

  const { data: goals } = useQuery<HealthGoal[]>({
    queryKey: ["/api/health-goals"],
  });

  const todayLog = logs?.find((l) => l.date === today);
  const chartData = logs?.slice().sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-md" />
          <Skeleton className="h-48 rounded-md" />
        </div>
      </div>
    );
  }

  const sortedLogs = logs?.slice().sort((a, b) => b.date.localeCompare(a.date)) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]" data-testid="dashboard-page">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        {todayLog ? (
          <Badge variant="secondary" data-testid="badge-today-logged">Logged today</Badge>
        ) : (
          <Badge variant="outline" data-testid="badge-today-not-logged">No log today</Badge>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Sleep"
          value={todayLog?.sleepHours}
          unit="hrs"
          icon={Moon}
          trend={getTrend(sortedLogs, "sleepHours")}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
        />
        <KPICard
          title="Calories"
          value={todayLog?.calories}
          unit="kcal"
          icon={Flame}
          trend={getTrend(sortedLogs, "calories")}
          color="bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
        />
        <KPICard
          title="Steps"
          value={todayLog?.steps ? todayLog.steps.toLocaleString() : null}
          unit="steps"
          icon={Footprints}
          trend={getTrend(sortedLogs, "steps")}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <KPICard
          title="Water"
          value={todayLog?.water}
          unit="L"
          icon={Droplets}
          trend={getTrend(sortedLogs, "water")}
          color="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
        />
        <KPICard
          title="Heart Rate"
          value={todayLog?.heartRate}
          unit="bpm"
          icon={Heart}
          trend={getTrend(sortedLogs, "heartRate")}
          color="bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
        />
        <KPICard
          title="Weight"
          value={todayLog?.weight}
          unit="lbs"
          icon={Scale}
          trend={getTrend(sortedLogs, "weight")}
          color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
        />
        <KPICard
          title="Mood"
          value={todayLog?.mood ? ["", "Low", "Below Avg", "Neutral", "Good", "Great"][todayLog.mood] : null}
          unit=""
          icon={Brain}
          trend={getTrend(sortedLogs, "mood")}
          color="bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
        />
        <KPICard
          title="Energy"
          value={todayLog?.energyLevel ? ["", "Low", "Below Avg", "Neutral", "Good", "Great"][todayLog.energyLevel] : null}
          unit=""
          icon={Activity}
          trend={getTrend(sortedLogs, "energyLevel")}
          color="bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400"
        />
      </div>

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sleep (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <MiniChart data={chartData} dataKey="sleepHours" color="hsl(240, 50%, 55%)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Steps (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <MiniChart data={chartData} dataKey="steps" color="hsl(152, 45%, 40%)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Weight (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <MiniChart data={chartData} dataKey="weight" color="hsl(35, 70%, 50%)" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mood (30 days)</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <MiniChart data={chartData} dataKey="mood" color="hsl(280, 50%, 55%)" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Progress */}
      {goals && goals.length > 0 && todayLog && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Goal Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.filter(g => g.isActive === 1).map((goal) => {
                const currentVal = Number((todayLog as any)[goal.metric]) || 0;
                const pct = Math.min(100, Math.round((currentVal / goal.target) * 100));
                return (
                  <div key={goal.id} data-testid={`goal-progress-${goal.id}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium capitalize">
                        {goal.metric.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {currentVal} / {goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!logs || logs.length === 0) && (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base font-medium mb-1">No health data yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Start logging your daily health metrics to see your dashboard come to life. Head to Log Entry to record today.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
