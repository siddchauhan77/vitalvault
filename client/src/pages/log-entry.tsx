import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { format, subDays, addDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Utensils,
  Dumbbell,
  HeartPulse,
  Brain,
  Save,
  Trash2,
} from "lucide-react";

function RatingSelector({
  value,
  onChange,
  labels,
  testId,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  labels: string[];
  testId: string;
}) {
  return (
    <div className="flex gap-1.5" data-testid={testId}>
      {labels.map((label, i) => {
        const rating = i + 1;
        const isSelected = value === rating;
        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`flex-1 py-1.5 px-1 rounded-md text-xs font-medium transition-colors border ${
              isSelected
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function LogEntry() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: existingLog, isLoading } = useQuery<HealthLog | null>({
    queryKey: ["/api/health-logs", selectedDate],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/health-logs/${selectedDate}`);
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const [form, setForm] = useState<Record<string, any>>({});

  // Merge existing log into form when it loads
  const currentForm = existingLog
    ? { ...existingLog, ...form }
    : { date: selectedDate, ...form };

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: selectedDate,
        sleepHours: currentForm.sleepHours ? Number(currentForm.sleepHours) : null,
        sleepQuality: currentForm.sleepQuality ? Number(currentForm.sleepQuality) : null,
        calories: currentForm.calories ? Number(currentForm.calories) : null,
        protein: currentForm.protein ? Number(currentForm.protein) : null,
        water: currentForm.water ? Number(currentForm.water) : null,
        exerciseMinutes: currentForm.exerciseMinutes ? Number(currentForm.exerciseMinutes) : null,
        exerciseType: currentForm.exerciseType || null,
        steps: currentForm.steps ? Number(currentForm.steps) : null,
        weight: currentForm.weight ? Number(currentForm.weight) : null,
        heartRate: currentForm.heartRate ? Number(currentForm.heartRate) : null,
        bloodPressureSystolic: currentForm.bloodPressureSystolic ? Number(currentForm.bloodPressureSystolic) : null,
        bloodPressureDiastolic: currentForm.bloodPressureDiastolic ? Number(currentForm.bloodPressureDiastolic) : null,
        mood: currentForm.mood ? Number(currentForm.mood) : null,
        energyLevel: currentForm.energyLevel ? Number(currentForm.energyLevel) : null,
        stressLevel: currentForm.stressLevel ? Number(currentForm.stressLevel) : null,
        notes: currentForm.notes || null,
      };
      await apiRequest("POST", "/api/health-logs", payload);
    },
    onSuccess: () => {
      toast({ title: "Saved", description: `Log for ${format(new Date(selectedDate + "T12:00:00"), "MMM d, yyyy")} saved.` });
      queryClient.invalidateQueries({ queryKey: ["/api/health-logs"] });
      setForm({});
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (existingLog) {
        await apiRequest("DELETE", `/api/health-logs/${existingLog.id}`);
      }
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Log entry deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/health-logs"] });
      setForm({});
    },
  });

  const navigateDate = (dir: -1 | 1) => {
    const fn = dir === -1 ? subDays : addDays;
    const newDate = format(fn(new Date(selectedDate + "T12:00:00"), 1), "yyyy-MM-dd");
    setSelectedDate(newDate);
    setForm({});
  };

  return (
    <div className="p-6 max-w-3xl space-y-6" data-testid="log-entry-page">
      <div>
        <h1 className="text-xl font-semibold">Log Entry</h1>
        <p className="text-sm text-muted-foreground">Record your daily health metrics</p>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigateDate(-1)} data-testid="button-prev-date">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium" data-testid="text-selected-date">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}
          </p>
          {selectedDate === format(new Date(), "yyyy-MM-dd") && (
            <Badge variant="secondary" className="mt-1">Today</Badge>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigateDate(1)}
          disabled={selectedDate >= format(new Date(), "yyyy-MM-dd")}
          data-testid="button-next-date"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-md" />
        </div>
      ) : (
        <Tabs defaultValue="sleep" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="sleep" data-testid="tab-sleep">
              <Moon className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Sleep</span>
            </TabsTrigger>
            <TabsTrigger value="nutrition" data-testid="tab-nutrition">
              <Utensils className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Nutrition</span>
            </TabsTrigger>
            <TabsTrigger value="exercise" data-testid="tab-exercise">
              <Dumbbell className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Exercise</span>
            </TabsTrigger>
            <TabsTrigger value="vitals" data-testid="tab-vitals">
              <HeartPulse className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Vitals</span>
            </TabsTrigger>
            <TabsTrigger value="wellness" data-testid="tab-wellness">
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Wellness</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sleep">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Sleep</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sleepHours" className="text-xs">Hours</Label>
                    <Input
                      id="sleepHours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="7.5"
                      value={currentForm.sleepHours ?? ""}
                      onChange={(e) => updateField("sleepHours", e.target.value)}
                      data-testid="input-sleep-hours"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Quality</Label>
                  <RatingSelector
                    value={currentForm.sleepQuality}
                    onChange={(v) => updateField("sleepQuality", v)}
                    labels={["Poor", "Fair", "OK", "Good", "Great"]}
                    testId="rating-sleep-quality"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nutrition">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Nutrition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="calories" className="text-xs">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="2000"
                      value={currentForm.calories ?? ""}
                      onChange={(e) => updateField("calories", e.target.value)}
                      data-testid="input-calories"
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein" className="text-xs">Protein (g)</Label>
                    <Input
                      id="protein"
                      type="number"
                      placeholder="120"
                      value={currentForm.protein ?? ""}
                      onChange={(e) => updateField("protein", e.target.value)}
                      data-testid="input-protein"
                    />
                  </div>
                  <div>
                    <Label htmlFor="water" className="text-xs">Water (L)</Label>
                    <Input
                      id="water"
                      type="number"
                      step="0.25"
                      placeholder="3.0"
                      value={currentForm.water ?? ""}
                      onChange={(e) => updateField("water", e.target.value)}
                      data-testid="input-water"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercise">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Exercise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exerciseMinutes" className="text-xs">Duration (min)</Label>
                    <Input
                      id="exerciseMinutes"
                      type="number"
                      placeholder="60"
                      value={currentForm.exerciseMinutes ?? ""}
                      onChange={(e) => updateField("exerciseMinutes", e.target.value)}
                      data-testid="input-exercise-minutes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="steps" className="text-xs">Steps</Label>
                    <Input
                      id="steps"
                      type="number"
                      placeholder="10000"
                      value={currentForm.steps ?? ""}
                      onChange={(e) => updateField("steps", e.target.value)}
                      data-testid="input-steps"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="exerciseType" className="text-xs">Type</Label>
                  <Select
                    value={currentForm.exerciseType || ""}
                    onValueChange={(v) => updateField("exerciseType", v)}
                  >
                    <SelectTrigger data-testid="select-exercise-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strength">Strength</SelectItem>
                      <SelectItem value="cardio">Cardio</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="walking">Walking</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vitals">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight" className="text-xs">Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="175"
                      value={currentForm.weight ?? ""}
                      onChange={(e) => updateField("weight", e.target.value)}
                      data-testid="input-weight"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heartRate" className="text-xs">Resting HR (bpm)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      placeholder="68"
                      value={currentForm.heartRate ?? ""}
                      onChange={(e) => updateField("heartRate", e.target.value)}
                      data-testid="input-heart-rate"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bpSys" className="text-xs">BP Systolic</Label>
                    <Input
                      id="bpSys"
                      type="number"
                      placeholder="120"
                      value={currentForm.bloodPressureSystolic ?? ""}
                      onChange={(e) => updateField("bloodPressureSystolic", e.target.value)}
                      data-testid="input-bp-systolic"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bpDia" className="text-xs">BP Diastolic</Label>
                    <Input
                      id="bpDia"
                      type="number"
                      placeholder="80"
                      value={currentForm.bloodPressureDiastolic ?? ""}
                      onChange={(e) => updateField("bloodPressureDiastolic", e.target.value)}
                      data-testid="input-bp-diastolic"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wellness">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Wellness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Mood</Label>
                  <RatingSelector
                    value={currentForm.mood}
                    onChange={(v) => updateField("mood", v)}
                    labels={["Low", "Below Avg", "Neutral", "Good", "Great"]}
                    testId="rating-mood"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Energy Level</Label>
                  <RatingSelector
                    value={currentForm.energyLevel}
                    onChange={(v) => updateField("energyLevel", v)}
                    labels={["Low", "Below Avg", "Neutral", "Good", "High"]}
                    testId="rating-energy"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Stress Level</Label>
                  <RatingSelector
                    value={currentForm.stressLevel}
                    onChange={(v) => updateField("stressLevel", v)}
                    labels={["None", "Low", "Moderate", "High", "Severe"]}
                    testId="rating-stress"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-xs">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Anything noteworthy about today..."
                    value={currentForm.notes ?? ""}
                    onChange={(e) => updateField("notes", e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="input-notes"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          {existingLog && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="text-destructive"
              data-testid="button-delete-log"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-log"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saveMutation.isPending ? "Saving..." : existingLog ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}
