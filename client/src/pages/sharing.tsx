import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SharingPermission } from "@shared/schema";
import {
  Shield,
  Moon,
  Flame,
  Footprints,
  Droplets,
  Heart,
  Brain,
  Activity,
  Scale,
  Dumbbell,
  Timer,
  Gauge,
  Zap,
  AlertTriangle,
} from "lucide-react";

const METRIC_INFO: Record<string, { label: string; icon: any; category: string }> = {
  sleepHours: { label: "Sleep Hours", icon: Moon, category: "Sleep" },
  sleepQuality: { label: "Sleep Quality", icon: Moon, category: "Sleep" },
  calories: { label: "Calories", icon: Flame, category: "Nutrition" },
  protein: { label: "Protein", icon: Flame, category: "Nutrition" },
  water: { label: "Water Intake", icon: Droplets, category: "Nutrition" },
  exerciseMinutes: { label: "Exercise Duration", icon: Dumbbell, category: "Fitness" },
  exerciseType: { label: "Exercise Type", icon: Timer, category: "Fitness" },
  steps: { label: "Steps", icon: Footprints, category: "Fitness" },
  weight: { label: "Weight", icon: Scale, category: "Vitals" },
  heartRate: { label: "Heart Rate", icon: Heart, category: "Vitals" },
  bloodPressureSystolic: { label: "BP Systolic", icon: Gauge, category: "Vitals" },
  bloodPressureDiastolic: { label: "BP Diastolic", icon: Gauge, category: "Vitals" },
  mood: { label: "Mood", icon: Brain, category: "Wellness" },
  energyLevel: { label: "Energy Level", icon: Zap, category: "Wellness" },
  stressLevel: { label: "Stress Level", icon: AlertTriangle, category: "Wellness" },
};

const CATEGORIES = ["Sleep", "Nutrition", "Fitness", "Vitals", "Wellness"];

export default function SharingPage() {
  const { toast } = useToast();

  const { data: permissions, isLoading } = useQuery<SharingPermission[]>({
    queryKey: ["/api/sharing-permissions"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ metric, shared }: { metric: string; shared: number }) => {
      await apiRequest("PATCH", "/api/sharing-permissions", { metric, shared });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sharing-permissions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update sharing setting.", variant: "destructive" });
    },
  });

  const sharedCount = permissions?.filter(p => p.shared === 1).length ?? 0;
  const totalCount = permissions?.length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl" data-testid="sharing-page">
      <div>
        <h1 className="text-xl font-semibold">Sharing Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Choose which metrics family members can see
        </p>
      </div>

      {/* Privacy notice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Nothing shared by default</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You are in full control. Toggle on only the metrics you want family members to see.
                Everything else stays completely private — even from family.
              </p>
              <div className="mt-2">
                <Badge variant={sharedCount > 0 ? "default" : "secondary"}>
                  {sharedCount} of {totalCount} metrics shared
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map((category) => {
            const categoryMetrics = Object.entries(METRIC_INFO).filter(
              ([, info]) => info.category === category
            );
            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {categoryMetrics.map(([metricKey, info]) => {
                    const perm = permissions?.find(p => p.metric === metricKey);
                    const isShared = perm?.shared === 1;
                    const Icon = info.icon;
                    return (
                      <div
                        key={metricKey}
                        className="flex items-center justify-between gap-3 py-2"
                        data-testid={`sharing-row-${metricKey}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{info.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isShared && (
                            <Badge variant="secondary" className="text-xs">Shared</Badge>
                          )}
                          <Switch
                            checked={isShared}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ metric: metricKey, shared: checked ? 1 : 0 })
                            }
                            data-testid={`switch-sharing-${metricKey}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
