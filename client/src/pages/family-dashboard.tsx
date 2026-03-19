import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, HealthLog } from "@shared/schema";
import {
  Users,
  Moon,
  Flame,
  Footprints,
  Droplets,
  Heart,
  Brain,
  Activity,
  Scale,
  Dumbbell,
  Zap,
  AlertTriangle,
  Gauge,
  Timer,
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

const METRIC_DISPLAY: Record<string, { label: string; icon: any; unit: string; color: string }> = {
  sleepHours: { label: "Sleep", icon: Moon, unit: "hrs", color: "hsl(240, 50%, 55%)" },
  sleepQuality: { label: "Sleep Quality", icon: Moon, unit: "/5", color: "hsl(260, 50%, 60%)" },
  calories: { label: "Calories", icon: Flame, unit: "kcal", color: "hsl(25, 80%, 55%)" },
  protein: { label: "Protein", icon: Flame, unit: "g", color: "hsl(15, 70%, 50%)" },
  water: { label: "Water", icon: Droplets, unit: "L", color: "hsl(200, 60%, 50%)" },
  exerciseMinutes: { label: "Exercise", icon: Dumbbell, unit: "min", color: "hsl(170, 50%, 45%)" },
  steps: { label: "Steps", icon: Footprints, unit: "", color: "hsl(152, 45%, 40%)" },
  weight: { label: "Weight", icon: Scale, unit: "lbs", color: "hsl(35, 70%, 50%)" },
  heartRate: { label: "Heart Rate", icon: Heart, unit: "bpm", color: "hsl(0, 60%, 50%)" },
  bloodPressureSystolic: { label: "BP Systolic", icon: Gauge, unit: "mmHg", color: "hsl(0, 50%, 55%)" },
  bloodPressureDiastolic: { label: "BP Diastolic", icon: Gauge, unit: "mmHg", color: "hsl(0, 40%, 50%)" },
  mood: { label: "Mood", icon: Brain, unit: "/5", color: "hsl(280, 50%, 55%)" },
  energyLevel: { label: "Energy", icon: Zap, unit: "/5", color: "hsl(45, 70%, 50%)" },
  stressLevel: { label: "Stress", icon: AlertTriangle, unit: "/5", color: "hsl(0, 60%, 55%)" },
};

function SharedMetricCard({ data, metricKey }: { data: Partial<HealthLog>[]; metricKey: string }) {
  const info = METRIC_DISPLAY[metricKey];
  if (!info) return null;
  const Icon = info.icon;

  const chartData = data
    .filter(d => (d as any)[metricKey] != null)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  const latestValue = chartData.length > 0 ? (chartData[chartData.length - 1] as any)[metricKey] : null;

  return (
    <Card data-testid={`shared-metric-${metricKey}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{info.label}</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold tabular-nums">
              {latestValue ?? "--"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{info.unit}</span>
          </div>
        </div>
        {chartData.length > 1 && (
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-shared-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={info.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={info.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: 11,
                }}
                labelFormatter={(v) => {
                  try { return format(parseISO(v as string), "MMM d"); } catch { return v; }
                }}
              />
              <Area
                type="monotone"
                dataKey={metricKey}
                stroke={info.color}
                strokeWidth={1.5}
                fill={`url(#grad-shared-${metricKey})`}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FamilyMemberView({ member }: { member: User }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { data: sharedData, isLoading } = useQuery<Partial<HealthLog>[]>({
    queryKey: ["/api/family/health-data", member.id, `?start=${thirtyDaysAgo}&end=${today}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/family/health-data/${member.id}?start=${thirtyDaysAgo}&end=${today}`);
      return res.json();
    },
  });

  // Determine which metrics this member is sharing (non-null values)
  const sharedMetrics = new Set<string>();
  if (sharedData) {
    for (const log of sharedData) {
      for (const [key, val] of Object.entries(log)) {
        if (key !== "id" && key !== "date" && key !== "userId" && val != null) {
          sharedMetrics.add(key);
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="h-32 rounded-md" />
        </div>
      </div>
    );
  }

  if (!sharedData || sharedData.length === 0 || sharedMetrics.size === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {member.displayName} hasn't shared any health metrics yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from(sharedMetrics).map((metricKey) => (
        <SharedMetricCard key={metricKey} data={sharedData} metricKey={metricKey} />
      ))}
    </div>
  );
}

export default function FamilyDashboard() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery<User[]>({
    queryKey: ["/api/family/members"],
  });

  const selectedMember = members?.find(m => m.id === selectedMemberId);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]" data-testid="family-dashboard-page">
      <div>
        <h1 className="text-xl font-semibold">Family Dashboard</h1>
        <p className="text-sm text-muted-foreground">View shared health metrics from family members</p>
      </div>

      {isLoading ? (
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-md" />
          ))}
        </div>
      ) : members && members.length > 0 ? (
        <>
          {/* Member selector */}
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(selectedMemberId === member.id ? null : member.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                  selectedMemberId === member.id
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card border-border hover:bg-accent"
                }`}
                data-testid={`button-select-member-${member.id}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  selectedMemberId === member.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                }`}>
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                {member.displayName}
              </button>
            ))}
          </div>

          {/* Selected member's shared data */}
          {selectedMember ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-medium">{selectedMember.displayName}'s Shared Data</h2>
                <Badge variant="secondary" className="text-xs">Last 30 days</Badge>
              </div>
              <FamilyMemberView member={selectedMember} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a family member above to view their shared health data.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base font-medium mb-1">No family members yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Join or create a family group first, then family members who share their data will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
