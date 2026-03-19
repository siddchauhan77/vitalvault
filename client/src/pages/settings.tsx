import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { HealthLog, HealthGoal } from "@shared/schema";
import { Download, Upload, Shield, Trash2, Database, Lock, Eye } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);

  const { data: logs } = useQuery<HealthLog[]>({
    queryKey: ["/api/health-logs"],
  });

  const { data: goals } = useQuery<HealthGoal[]>({
    queryKey: ["/api/health-goals"],
  });

  const handleExport = async () => {
    try {
      const res = await apiRequest("GET", "/api/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vitalvault-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Your data has been downloaded." });
    } catch {
      toast({ title: "Error", description: "Failed to export data.", variant: "destructive" });
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.healthLogs && Array.isArray(data.healthLogs)) {
          const res = await apiRequest("POST", "/api/import", { healthLogs: data.healthLogs });
          const result = await res.json();
          queryClient.invalidateQueries({ queryKey: ["/api/health-logs"] });
          toast({ title: "Imported", description: `${result.imported} log entries imported.` });
        } else {
          toast({ title: "Invalid file", description: "File must contain a healthLogs array.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Error", description: "Failed to import data.", variant: "destructive" });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all logs
      if (logs) {
        for (const log of logs) {
          await apiRequest("DELETE", `/api/health-logs/${log.id}`);
        }
      }
      // Delete all goals
      if (goals) {
        for (const goal of goals) {
          await apiRequest("DELETE", `/api/health-goals/${goal.id}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/health-goals"] });
      toast({ title: "All data cleared" });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-3xl" data-testid="settings-page">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your data and privacy</p>
      </div>

      {/* Privacy Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Privacy Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">Data storage</span>
              </div>
              <Badge variant="secondary">Server-side in-memory</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">Third-party access</span>
              </div>
              <Badge variant="secondary">None</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">Tracking / analytics</span>
              </div>
              <Badge variant="secondary">None</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            VitalVault stores all data in-memory on the server. No data is sent to third parties, no tracking scripts are loaded, and no analytics are collected. Export your data regularly to keep a local backup.
          </p>
        </CardContent>
      </Card>

      {/* Data stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums" data-testid="text-log-count">
                {logs?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Log entries</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums" data-testid="text-goal-count">
                {goals?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Active goals</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export / Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} data-testid="button-export">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Import Data</p>
              <p className="text-xs text-muted-foreground">Restore from a previous export</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleImport} disabled={importing} data-testid="button-import">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Permanently delete all logs and goals</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-clear-all">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your health logs and goals. Export your data first if you want to keep a backup.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearAllMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-clear"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
