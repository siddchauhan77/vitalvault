import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHealthLogSchema, insertHealthGoalSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health Logs
  app.get("/api/health-logs", async (_req, res) => {
    const logs = await storage.getAllHealthLogs();
    res.json(logs);
  });

  app.get("/api/health-logs/range", async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end dates required" });
    }
    const logs = await storage.getHealthLogsByRange(start as string, end as string);
    res.json(logs);
  });

  app.get("/api/health-logs/:date", async (req, res) => {
    const log = await storage.getHealthLogByDate(req.params.date);
    if (!log) return res.status(404).json({ error: "No log for this date" });
    res.json(log);
  });

  app.post("/api/health-logs", async (req, res) => {
    const parsed = insertHealthLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    // Check if date already exists, if so update
    const existing = await storage.getHealthLogByDate(parsed.data.date);
    if (existing) {
      const updated = await storage.updateHealthLog(existing.id, parsed.data);
      return res.json(updated);
    }
    const log = await storage.createHealthLog(parsed.data);
    res.status(201).json(log);
  });

  app.patch("/api/health-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateHealthLog(id, req.body);
    if (!updated) return res.status(404).json({ error: "Log not found" });
    res.json(updated);
  });

  app.delete("/api/health-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteHealthLog(id);
    if (!deleted) return res.status(404).json({ error: "Log not found" });
    res.status(204).send();
  });

  // Health Goals
  app.get("/api/health-goals", async (_req, res) => {
    const goals = await storage.getAllHealthGoals();
    res.json(goals);
  });

  app.post("/api/health-goals", async (req, res) => {
    const parsed = insertHealthGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const goal = await storage.createHealthGoal(parsed.data);
    res.status(201).json(goal);
  });

  app.patch("/api/health-goals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateHealthGoal(id, req.body);
    if (!updated) return res.status(404).json({ error: "Goal not found" });
    res.json(updated);
  });

  app.delete("/api/health-goals/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteHealthGoal(id);
    if (!deleted) return res.status(404).json({ error: "Goal not found" });
    res.status(204).send();
  });

  // Data export/import
  app.get("/api/export", async (_req, res) => {
    const data = await storage.exportAllData();
    res.json(data);
  });

  app.post("/api/import", async (req, res) => {
    const { healthLogs } = req.body;
    if (!Array.isArray(healthLogs)) {
      return res.status(400).json({ error: "healthLogs array required" });
    }
    const count = await storage.importHealthLogs(healthLogs);
    res.json({ imported: count });
  });

  return httpServer;
}
