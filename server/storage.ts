// @ts-nocheck
import {
  type User, type InsertUser,
  type HealthLog, type InsertHealthLog,
  type HealthGoal, type InsertHealthGoal,
  type FamilyGroup, type InsertFamilyGroup,
  type FamilyMember, type InsertFamilyMember,
  type SharingPermission, type InsertSharingPermission,
  SHAREABLE_METRICS,
} from "../shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Health logs (user-scoped)
  getHealthLogsByUser(userId: string): Promise<HealthLog[]>;
  getHealthLogByDateAndUser(userId: string, date: string): Promise<HealthLog | undefined>;
  getHealthLogsByRangeAndUser(userId: string, startDate: string, endDate: string): Promise<HealthLog[]>;
  createHealthLog(log: InsertHealthLog): Promise<HealthLog>;
  updateHealthLog(id: number, userId: string, log: Partial<InsertHealthLog>): Promise<HealthLog | undefined>;
  deleteHealthLog(id: number, userId: string): Promise<boolean>;
  // Health goals (user-scoped)
  getHealthGoalsByUser(userId: string): Promise<HealthGoal[]>;
  createHealthGoal(goal: InsertHealthGoal): Promise<HealthGoal>;
  updateHealthGoal(id: number, userId: string, goal: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined>;
  deleteHealthGoal(id: number, userId: string): Promise<boolean>;
  // Bulk ops for import/export (user-scoped)
  importHealthLogs(userId: string, logs: InsertHealthLog[]): Promise<number>;
  exportAllData(userId: string): Promise<{ healthLogs: HealthLog[]; healthGoals: HealthGoal[] }>;
  // Family groups
  createFamilyGroup(group: InsertFamilyGroup): Promise<FamilyGroup>;
  getFamilyGroup(id: string): Promise<FamilyGroup | undefined>;
  getFamilyGroupByJoinCode(code: string): Promise<FamilyGroup | undefined>;
  getFamilyGroupsForUser(userId: string): Promise<(FamilyGroup & { memberCount: number; role: string })[]>;
  deleteFamilyGroup(id: string, ownerId: string): Promise<boolean>;
  // Family members
  addFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  getFamilyMembers(groupId: string): Promise<(FamilyMember & { user: User })[]>;
  removeFamilyMember(groupId: string, userId: string): Promise<boolean>;
  isFamilyMember(groupId: string, userId: string): Promise<boolean>;
  getFamilyMemberUsers(userId: string): Promise<User[]>;
  // Sharing permissions
  getSharingPermissions(userId: string): Promise<SharingPermission[]>;
  upsertSharingPermission(perm: InsertSharingPermission): Promise<SharingPermission>;
  getSharedMetricsForUser(userId: string): Promise<string[]>;
  // Family dashboard: get shared health data from family members
  getSharedHealthData(viewerId: string, targetUserId: string, startDate: string, endDate: string): Promise<Partial<HealthLog>[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private healthLogs: Map<number, HealthLog>;
  private healthGoals: Map<number, HealthGoal>;
  private familyGroups: Map<string, FamilyGroup>;
  private familyMembers: Map<number, FamilyMember>;
  private sharingPermissions: Map<number, SharingPermission>;
  private nextLogId: number;
  private nextGoalId: number;
  private nextMemberId: number;
  private nextPermId: number;

  constructor() {
    this.users = new Map();
    this.healthLogs = new Map();
    this.healthGoals = new Map();
    this.familyGroups = new Map();
    this.familyMembers = new Map();
    this.sharingPermissions = new Map();
    this.nextLogId = 1;
    this.nextGoalId = 1;
    this.nextMemberId = 1;
    this.nextPermId = 1;
  }

  // --- Users ---
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.googleId === googleId);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { ...insertUser, avatarUrl: insertUser.avatarUrl ?? null };
    this.users.set(user.id, user);
    // Initialize sharing permissions — all off by default
    for (const metric of SHAREABLE_METRICS) {
      const id = this.nextPermId++;
      this.sharingPermissions.set(id, { id, userId: user.id, metric, shared: 0 });
    }
    return user;
  }

  // --- Health Logs (user-scoped) ---
  async getHealthLogsByUser(userId: string): Promise<HealthLog[]> {
    return Array.from(this.healthLogs.values())
      .filter(l => l.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getHealthLogByDateAndUser(userId: string, date: string): Promise<HealthLog | undefined> {
    return Array.from(this.healthLogs.values()).find(l => l.userId === userId && l.date === date);
  }

  async getHealthLogsByRangeAndUser(userId: string, startDate: string, endDate: string): Promise<HealthLog[]> {
    return Array.from(this.healthLogs.values())
      .filter(l => l.userId === userId && l.date >= startDate && l.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createHealthLog(log: InsertHealthLog): Promise<HealthLog> {
    const id = this.nextLogId++;
    const healthLog: HealthLog = {
      id,
      userId: log.userId,
      date: log.date,
      sleepHours: log.sleepHours ?? null,
      sleepQuality: log.sleepQuality ?? null,
      calories: log.calories ?? null,
      protein: log.protein ?? null,
      water: log.water ?? null,
      exerciseMinutes: log.exerciseMinutes ?? null,
      exerciseType: log.exerciseType ?? null,
      steps: log.steps ?? null,
      weight: log.weight ?? null,
      heartRate: log.heartRate ?? null,
      bloodPressureSystolic: log.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: log.bloodPressureDiastolic ?? null,
      mood: log.mood ?? null,
      energyLevel: log.energyLevel ?? null,
      stressLevel: log.stressLevel ?? null,
      notes: log.notes ?? null,
    };
    this.healthLogs.set(id, healthLog);
    return healthLog;
  }

  async updateHealthLog(id: number, userId: string, log: Partial<InsertHealthLog>): Promise<HealthLog | undefined> {
    const existing = this.healthLogs.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    const updated = { ...existing, ...log };
    this.healthLogs.set(id, updated);
    return updated;
  }

  async deleteHealthLog(id: number, userId: string): Promise<boolean> {
    const existing = this.healthLogs.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.healthLogs.delete(id);
  }

  // --- Health Goals (user-scoped) ---
  async getHealthGoalsByUser(userId: string): Promise<HealthGoal[]> {
    return Array.from(this.healthGoals.values()).filter(g => g.userId === userId);
  }

  async createHealthGoal(goal: InsertHealthGoal): Promise<HealthGoal> {
    const id = this.nextGoalId++;
    const healthGoal: HealthGoal = { id, ...goal, isActive: goal.isActive ?? 1 };
    this.healthGoals.set(id, healthGoal);
    return healthGoal;
  }

  async updateHealthGoal(id: number, userId: string, goal: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined> {
    const existing = this.healthGoals.get(id);
    if (!existing || existing.userId !== userId) return undefined;
    const updated = { ...existing, ...goal };
    this.healthGoals.set(id, updated);
    return updated;
  }

  async deleteHealthGoal(id: number, userId: string): Promise<boolean> {
    const existing = this.healthGoals.get(id);
    if (!existing || existing.userId !== userId) return false;
    return this.healthGoals.delete(id);
  }

  // --- Bulk operations (user-scoped) ---
  async importHealthLogs(userId: string, logs: InsertHealthLog[]): Promise<number> {
    let count = 0;
    for (const log of logs) {
      const existing = await this.getHealthLogByDateAndUser(userId, log.date);
      if (existing) {
        await this.updateHealthLog(existing.id, userId, { ...log, userId });
      } else {
        await this.createHealthLog({ ...log, userId });
      }
      count++;
    }
    return count;
  }

  async exportAllData(userId: string): Promise<{ healthLogs: HealthLog[]; healthGoals: HealthGoal[] }> {
    return {
      healthLogs: await this.getHealthLogsByUser(userId),
      healthGoals: await this.getHealthGoalsByUser(userId),
    };
  }

  // --- Family Groups ---
  async createFamilyGroup(group: InsertFamilyGroup): Promise<FamilyGroup> {
    const fg: FamilyGroup = { ...group };
    this.familyGroups.set(fg.id, fg);
    // Add owner as member
    const memberId = this.nextMemberId++;
    this.familyMembers.set(memberId, {
      id: memberId,
      groupId: fg.id,
      userId: fg.ownerId,
      role: "owner",
    });
    return fg;
  }

  async getFamilyGroup(id: string): Promise<FamilyGroup | undefined> {
    return this.familyGroups.get(id);
  }

  async getFamilyGroupByJoinCode(code: string): Promise<FamilyGroup | undefined> {
    return Array.from(this.familyGroups.values()).find(g => g.joinCode === code);
  }

  async getFamilyGroupsForUser(userId: string): Promise<(FamilyGroup & { memberCount: number; role: string })[]> {
    const memberships = Array.from(this.familyMembers.values()).filter(m => m.userId === userId);
    const results: (FamilyGroup & { memberCount: number; role: string })[] = [];
    for (const membership of memberships) {
      const group = this.familyGroups.get(membership.groupId);
      if (group) {
        const memberCount = Array.from(this.familyMembers.values()).filter(m => m.groupId === group.id).length;
        results.push({ ...group, memberCount, role: membership.role });
      }
    }
    return results;
  }

  async deleteFamilyGroup(id: string, ownerId: string): Promise<boolean> {
    const group = this.familyGroups.get(id);
    if (!group || group.ownerId !== ownerId) return false;
    // Remove all members
    for (const [key, member] of this.familyMembers) {
      if (member.groupId === id) this.familyMembers.delete(key);
    }
    return this.familyGroups.delete(id);
  }

  // --- Family Members ---
  async addFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    // Check if already a member
    const existing = Array.from(this.familyMembers.values())
      .find(m => m.groupId === member.groupId && m.userId === member.userId);
    if (existing) return existing;
    const id = this.nextMemberId++;
    const fm: FamilyMember = { id, ...member, role: member.role ?? "member" };
    this.familyMembers.set(id, fm);
    return fm;
  }

  async getFamilyMembers(groupId: string): Promise<(FamilyMember & { user: User })[]> {
    const members = Array.from(this.familyMembers.values()).filter(m => m.groupId === groupId);
    const results: (FamilyMember & { user: User })[] = [];
    for (const member of members) {
      const user = this.users.get(member.userId);
      if (user) {
        results.push({ ...member, user });
      }
    }
    return results;
  }

  async removeFamilyMember(groupId: string, userId: string): Promise<boolean> {
    for (const [key, member] of this.familyMembers) {
      if (member.groupId === groupId && member.userId === userId) {
        this.familyMembers.delete(key);
        return true;
      }
    }
    return false;
  }

  async isFamilyMember(groupId: string, userId: string): Promise<boolean> {
    return Array.from(this.familyMembers.values()).some(m => m.groupId === groupId && m.userId === userId);
  }

  async getFamilyMemberUsers(userId: string): Promise<User[]> {
    // Get all groups the user is in
    const myGroups = Array.from(this.familyMembers.values())
      .filter(m => m.userId === userId)
      .map(m => m.groupId);
    // Get all users in those groups (excluding self)
    const familyUserIds = new Set<string>();
    for (const member of this.familyMembers.values()) {
      if (myGroups.includes(member.groupId) && member.userId !== userId) {
        familyUserIds.add(member.userId);
      }
    }
    const result: User[] = [];
    for (const uid of familyUserIds) {
      const user = this.users.get(uid);
      if (user) result.push(user);
    }
    return result;
  }

  // --- Sharing Permissions ---
  async getSharingPermissions(userId: string): Promise<SharingPermission[]> {
    return Array.from(this.sharingPermissions.values()).filter(p => p.userId === userId);
  }

  async upsertSharingPermission(perm: InsertSharingPermission): Promise<SharingPermission> {
    // Find existing
    const existing = Array.from(this.sharingPermissions.values())
      .find(p => p.userId === perm.userId && p.metric === perm.metric);
    if (existing) {
      const updated = { ...existing, shared: perm.shared };
      this.sharingPermissions.set(existing.id, updated);
      return updated;
    }
    const id = this.nextPermId++;
    const sp: SharingPermission = { id, userId: perm.userId, metric: perm.metric, shared: perm.shared };
    this.sharingPermissions.set(id, sp);
    return sp;
  }

  async getSharedMetricsForUser(userId: string): Promise<string[]> {
    return Array.from(this.sharingPermissions.values())
      .filter(p => p.userId === userId && p.shared === 1)
      .map(p => p.metric);
  }

  // --- Family Dashboard: shared health data ---
  async getSharedHealthData(
    viewerId: string,
    targetUserId: string,
    startDate: string,
    endDate: string
  ): Promise<Partial<HealthLog>[]> {
    // Verify they share a family group
    const viewerGroups = Array.from(this.familyMembers.values())
      .filter(m => m.userId === viewerId)
      .map(m => m.groupId);
    const targetGroups = Array.from(this.familyMembers.values())
      .filter(m => m.userId === targetUserId)
      .map(m => m.groupId);
    const sharedGroup = viewerGroups.some(g => targetGroups.includes(g));
    if (!sharedGroup) return [];

    // Get which metrics the target user shares
    const sharedMetrics = await this.getSharedMetricsForUser(targetUserId);
    if (sharedMetrics.length === 0) return [];

    // Get the target user's health logs in range
    const logs = await this.getHealthLogsByRangeAndUser(targetUserId, startDate, endDate);

    // Filter to only shared metrics
    return logs.map(log => {
      const filtered: Partial<HealthLog> = { id: log.id, date: log.date, userId: log.userId };
      for (const metric of sharedMetrics) {
        (filtered as any)[metric] = (log as any)[metric];
      }
      return filtered;
    });
  }
}

export const storage = new MemStorage();
