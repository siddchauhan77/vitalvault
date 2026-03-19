import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertHealthLogSchema, insertHealthGoalSchema } from "../shared/schema";
import { randomUUID } from "crypto";

// Simple in-memory session store (token -> userId)
const sessions = new Map<string, string>();

// Helper to generate a 6-char alphanumeric join code
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Auth middleware — extracts userId from Bearer token
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = auth.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  (req as any).userId = userId;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== AUTH =====

  // Simulated Google Sign-In (creates or finds user, returns token)
  app.post("/api/auth/google", async (req, res) => {
    const { googleId, email, displayName, avatarUrl } = req.body;
    if (!googleId || !email || !displayName) {
      return res.status(400).json({ error: "googleId, email, and displayName required" });
    }

    // Find or create user
    let user = await storage.getUserByGoogleId(googleId);
    if (!user) {
      const id = randomUUID();
      user = await storage.createUser({ id, googleId, email, displayName, avatarUrl: avatarUrl || null });
    }

    // Create session
    const token = randomUUID();
    sessions.set(token, user.id);

    res.json({ token, user });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      sessions.delete(auth.slice(7));
    }
    res.json({ ok: true });
  });

  // ===== HEALTH LOGS (user-scoped) =====

  app.get("/api/health-logs", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const logs = await storage.getHealthLogsByUser(userId);
    res.json(logs);
  });

  app.get("/api/health-logs/range", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end dates required" });
    }
    const logs = await storage.getHealthLogsByRangeAndUser(userId, start as string, end as string);
    res.json(logs);
  });

  app.get("/api/health-logs/:date", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const log = await storage.getHealthLogByDateAndUser(userId, req.params.date);
    if (!log) return res.status(404).json({ error: "No log for this date" });
    res.json(log);
  });

  app.post("/api/health-logs", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const parsed = insertHealthLogSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const existing = await storage.getHealthLogByDateAndUser(userId, parsed.data.date);
    if (existing) {
      const updated = await storage.updateHealthLog(existing.id, userId, parsed.data);
      return res.json(updated);
    }
    const log = await storage.createHealthLog(parsed.data);
    res.status(201).json(log);
  });

  app.patch("/api/health-logs/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const id = parseInt(req.params.id);
    const updated = await storage.updateHealthLog(id, userId, req.body);
    if (!updated) return res.status(404).json({ error: "Log not found" });
    res.json(updated);
  });

  app.delete("/api/health-logs/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteHealthLog(id, userId);
    if (!deleted) return res.status(404).json({ error: "Log not found" });
    res.status(204).send();
  });

  // ===== HEALTH GOALS (user-scoped) =====

  app.get("/api/health-goals", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const goals = await storage.getHealthGoalsByUser(userId);
    res.json(goals);
  });

  app.post("/api/health-goals", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const parsed = insertHealthGoalSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const goal = await storage.createHealthGoal(parsed.data);
    res.status(201).json(goal);
  });

  app.patch("/api/health-goals/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const id = parseInt(req.params.id);
    const updated = await storage.updateHealthGoal(id, userId, req.body);
    if (!updated) return res.status(404).json({ error: "Goal not found" });
    res.json(updated);
  });

  app.delete("/api/health-goals/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteHealthGoal(id, userId);
    if (!deleted) return res.status(404).json({ error: "Goal not found" });
    res.status(204).send();
  });

  // ===== DATA EXPORT/IMPORT (user-scoped) =====

  app.get("/api/export", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const data = await storage.exportAllData(userId);
    res.json(data);
  });

  app.post("/api/import", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { healthLogs } = req.body;
    if (!Array.isArray(healthLogs)) {
      return res.status(400).json({ error: "healthLogs array required" });
    }
    const count = await storage.importHealthLogs(userId, healthLogs);
    res.json({ imported: count });
  });

  // ===== FAMILY GROUPS =====

  // List my family groups
  app.get("/api/family-groups", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const groups = await storage.getFamilyGroupsForUser(userId);
    res.json(groups);
  });

  // Create a family group
  app.post("/api/family-groups", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Group name required" });
    }
    const id = randomUUID();
    const joinCode = generateJoinCode();
    const group = await storage.createFamilyGroup({ id, name: name.trim(), ownerId: userId, joinCode });
    res.status(201).json(group);
  });

  // Get a specific group (with members)
  app.get("/api/family-groups/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const group = await storage.getFamilyGroup(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const isMember = await storage.isFamilyMember(group.id, userId);
    if (!isMember) return res.status(403).json({ error: "Not a member of this group" });
    const members = await storage.getFamilyMembers(group.id);
    res.json({ ...group, members });
  });

  // Join a group by code
  app.post("/api/family-groups/join", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Join code required" });
    const group = await storage.getFamilyGroupByJoinCode(code.toUpperCase().trim());
    if (!group) return res.status(404).json({ error: "Invalid join code" });
    const member = await storage.addFamilyMember({ groupId: group.id, userId, role: "member" });
    res.json({ group, member });
  });

  // Leave a group
  app.post("/api/family-groups/:id/leave", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const group = await storage.getFamilyGroup(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.ownerId === userId) {
      return res.status(400).json({ error: "Owner cannot leave. Delete the group instead." });
    }
    await storage.removeFamilyMember(group.id, userId);
    res.json({ ok: true });
  });

  // Remove a member (owner only)
  app.delete("/api/family-groups/:id/members/:memberId", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const group = await storage.getFamilyGroup(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.ownerId !== userId) {
      return res.status(403).json({ error: "Only the owner can remove members" });
    }
    if (req.params.memberId === userId) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }
    await storage.removeFamilyMember(group.id, req.params.memberId);
    res.json({ ok: true });
  });

  // Delete a group (owner only)
  app.delete("/api/family-groups/:id", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const deleted = await storage.deleteFamilyGroup(req.params.id, userId);
    if (!deleted) return res.status(404).json({ error: "Group not found or not owner" });
    res.status(204).send();
  });

  // ===== SHARING PERMISSIONS =====

  // Get my sharing permissions
  app.get("/api/sharing-permissions", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const perms = await storage.getSharingPermissions(userId);
    res.json(perms);
  });

  // Update a sharing permission
  app.patch("/api/sharing-permissions", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { metric, shared } = req.body;
    if (!metric || typeof shared !== "number") {
      return res.status(400).json({ error: "metric and shared (0 or 1) required" });
    }
    const perm = await storage.upsertSharingPermission({ userId, metric, shared });
    res.json(perm);
  });

  // ===== FAMILY DASHBOARD =====

  // Get list of family members I can view
  app.get("/api/family/members", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const members = await storage.getFamilyMemberUsers(userId);
    res.json(members);
  });

  // Get shared health data for a specific family member
  app.get("/api/family/health-data/:targetUserId", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "start and end dates required" });
    }
    const data = await storage.getSharedHealthData(userId, req.params.targetUserId, start as string, end as string);
    res.json(data);
  });

  return httpServer;
}
