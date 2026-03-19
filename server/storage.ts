import { type User, type InsertUser, type HealthLog, type InsertHealthLog, type HealthGoal, type InsertHealthGoal } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Health logs
  getAllHealthLogs(): Promise<HealthLog[]>;
  getHealthLogByDate(date: string): Promise<HealthLog | undefined>;
  getHealthLogsByRange(startDate: string, endDate: string): Promise<HealthLog[]>;
  createHealthLog(log: InsertHealthLog): Promise<HealthLog>;
  updateHealthLog(id: number, log: Partial<InsertHealthLog>): Promise<HealthLog | undefined>;
  deleteHealthLog(id: number): Promise<boolean>;
  // Health goals
  getAllHealthGoals(): Promise<HealthGoal[]>;
  createHealthGoal(goal: InsertHealthGoal): Promise<HealthGoal>;
  updateHealthGoal(id: number, goal: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined>;
  deleteHealthGoal(id: number): Promise<boolean>;
  // Bulk ops for import/export
  importHealthLogs(logs: InsertHealthLog[]): Promise<number>;
  exportAllData(): Promise<{ healthLogs: HealthLog[]; healthGoals: HealthGoal[] }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private healthLogs: Map<number, HealthLog>;
  private healthGoals: Map<number, HealthGoal>;
  private nextLogId: number;
  private nextGoalId: number;

  constructor() {
    this.users = new Map();
    this.healthLogs = new Map();
    this.healthGoals = new Map();
    this.nextLogId = 1;
    this.nextGoalId = 1;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Health logs
  async getAllHealthLogs(): Promise<HealthLog[]> {
    return Array.from(this.healthLogs.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  async getHealthLogByDate(date: string): Promise<HealthLog | undefined> {
    return Array.from(this.healthLogs.values()).find(l => l.date === date);
  }

  async getHealthLogsByRange(startDate: string, endDate: string): Promise<HealthLog[]> {
    return Array.from(this.healthLogs.values())
      .filter(l => l.date >= startDate && l.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createHealthLog(log: InsertHealthLog): Promise<HealthLog> {
    const id = this.nextLogId++;
    const healthLog: HealthLog = { id, ...log, sleepHours: log.sleepHours ?? null, sleepQuality: log.sleepQuality ?? null, calories: log.calories ?? null, protein: log.protein ?? null, water: log.water ?? null, exerciseMinutes: log.exerciseMinutes ?? null, exerciseType: log.exerciseType ?? null, steps: log.steps ?? null, weight: log.weight ?? null, heartRate: log.heartRate ?? null, bloodPressureSystolic: log.bloodPressureSystolic ?? null, bloodPressureDiastolic: log.bloodPressureDiastolic ?? null, mood: log.mood ?? null, energyLevel: log.energyLevel ?? null, stressLevel: log.stressLevel ?? null, notes: log.notes ?? null };
    this.healthLogs.set(id, healthLog);
    return healthLog;
  }

  async updateHealthLog(id: number, log: Partial<InsertHealthLog>): Promise<HealthLog | undefined> {
    const existing = this.healthLogs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...log };
    this.healthLogs.set(id, updated);
    return updated;
  }

  async deleteHealthLog(id: number): Promise<boolean> {
    return this.healthLogs.delete(id);
  }

  // Health goals
  async getAllHealthGoals(): Promise<HealthGoal[]> {
    return Array.from(this.healthGoals.values());
  }

  async createHealthGoal(goal: InsertHealthGoal): Promise<HealthGoal> {
    const id = this.nextGoalId++;
    const healthGoal: HealthGoal = { id, ...goal, isActive: goal.isActive ?? 1 };
    this.healthGoals.set(id, healthGoal);
    return healthGoal;
  }

  async updateHealthGoal(id: number, goal: Partial<InsertHealthGoal>): Promise<HealthGoal | undefined> {
    const existing = this.healthGoals.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...goal };
    this.healthGoals.set(id, updated);
    return updated;
  }

  async deleteHealthGoal(id: number): Promise<boolean> {
    return this.healthGoals.delete(id);
  }

  // Bulk operations
  async importHealthLogs(logs: InsertHealthLog[]): Promise<number> {
    let count = 0;
    for (const log of logs) {
      // Upsert by date
      const existing = await this.getHealthLogByDate(log.date);
      if (existing) {
        await this.updateHealthLog(existing.id, log);
      } else {
        await this.createHealthLog(log);
      }
      count++;
    }
    return count;
  }

  async exportAllData(): Promise<{ healthLogs: HealthLog[]; healthGoals: HealthGoal[] }> {
    return {
      healthLogs: await this.getAllHealthLogs(),
      healthGoals: await this.getAllHealthGoals(),
    };
  }
}

export const storage = new MemStorage();
