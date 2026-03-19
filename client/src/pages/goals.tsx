import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { HealthGoal } from "@shared/schema";
import { Plus, Target, Trash2 } from "lucide-react";

const METRIC_OPTIONS = [
  { value: "sleepHours", label: "Sleep Hours", unit: "hrs" },
  { value: "calories", label: "Calories", unit: "kcal" },
  { value: "protein", label: "Protein", unit: "g" },
  { value: "water", label: "Water", unit: "L" },
  { value: "steps", label: "Steps", unit: "steps" },
  { value: "exerciseMinutes", label: "Exercise Minutes", unit: "min" },
  { value: "weight", label: "Weight", unit: "lbs" },
  { value: "heartRate", label: "Heart Rate", unit: "bpm" },
  { value: "mood", label: "Mood", unit: "(1-5)" },
  { value: "energyLevel", label: "Energy Level", unit: "(1-5)" },
];

export default function Goals() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMetric, setNewMetric] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const { data: goals, isLoading } = useQuery<HealthGoal[]>({
    queryKey: ["/api/health-goals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const metricOpt = METRIC_OPTIONS.find((m) => m.value === newMetric);
      if (!metricOpt || !newTarget) throw new Error("Missing fields");
      await apiRequest("POST", "/api/health-goals", {
        metric: newMetric,
        target: Number(newTarget),
        unit: metricOpt.unit,
        isActive: 1,
      });
    },
    onSuccess: () => {
      toast({ title: "Goal created" });
      queryClient.invalidateQueries({ queryKey: ["/api/health-goals"] });
      setDialogOpen(false);
      setNewMetric("");
      setNewTarget("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create goal.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: number }) => {
      await apiRequest("PATCH", `/api/health-goals/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-goals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/health-goals/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Goal deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/health-goals"] });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl" data-testid="goals-page">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Goals</h1>
          <p className="text-sm text-muted-foreground">Set daily targets for your metrics</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-goal">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Metric</Label>
                <Select value={newMetric} onValueChange={setNewMetric}>
                  <SelectTrigger data-testid="select-goal-metric">
                    <SelectValue placeholder="Choose metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  Target {newMetric && `(${METRIC_OPTIONS.find((m) => m.value === newMetric)?.unit})`}
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 10000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  data-testid="input-goal-target"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!newMetric || !newTarget || createMutation.isPending}
                data-testid="button-save-goal"
              >
                {createMutation.isPending ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-md" />
          ))}
        </div>
      ) : goals && goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map((goal) => {
            const metricOpt = METRIC_OPTIONS.find((m) => m.value === goal.metric);
            return (
              <Card key={goal.id} data-testid={`goal-card-${goal.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {metricOpt?.label || goal.metric}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          Target: {goal.target} {goal.unit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={goal.isActive === 1}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: goal.id, isActive: checked ? 1 : 0 })
                        }
                        data-testid={`switch-goal-${goal.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(goal.id)}
                        className="text-muted-foreground"
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base font-medium mb-1">No goals set</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create your first health goal to track daily progress on your dashboard.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
