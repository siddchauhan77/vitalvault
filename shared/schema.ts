import { pgTable, text, integer, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users with Google auth
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Daily health log - the core data model (now user-scoped)
export const healthLogs = pgTable("health_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  // Sleep
  sleepHours: real("sleep_hours"),
  sleepQuality: integer("sleep_quality"), // 1-5
  // Nutrition
  calories: integer("calories"),
  protein: integer("protein"), // grams
  water: real("water"), // liters
  // Exercise
  exerciseMinutes: integer("exercise_minutes"),
  exerciseType: text("exercise_type"),
  steps: integer("steps"),
  // Vitals
  weight: real("weight"), // lbs
  heartRate: integer("heart_rate"), // bpm resting
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  // Wellness
  mood: integer("mood"), // 1-5
  energyLevel: integer("energy_level"), // 1-5
  stressLevel: integer("stress_level"), // 1-5
  // Notes
  notes: text("notes"),
});

export const insertHealthLogSchema = createInsertSchema(healthLogs).omit({ id: true });
export type InsertHealthLog = z.infer<typeof insertHealthLogSchema>;
export type HealthLog = typeof healthLogs.$inferSelect;

// Health goals (now user-scoped)
export const healthGoals = pgTable("health_goals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  metric: text("metric").notNull(),
  target: real("target").notNull(),
  unit: text("unit").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const insertHealthGoalSchema = createInsertSchema(healthGoals).omit({ id: true });
export type InsertHealthGoal = z.infer<typeof insertHealthGoalSchema>;
export type HealthGoal = typeof healthGoals.$inferSelect;

// Family groups
export const familyGroups = pgTable("family_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  joinCode: text("join_code").notNull().unique(),
});

export const insertFamilyGroupSchema = createInsertSchema(familyGroups);
export type InsertFamilyGroup = z.infer<typeof insertFamilyGroupSchema>;
export type FamilyGroup = typeof familyGroups.$inferSelect;

// Family members (junction table)
export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  groupId: text("group_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"), // "owner" | "member"
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true });
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Sharing permissions - per metric, per user
// Nothing shared by default. User explicitly enables each metric.
export const sharingPermissions = pgTable("sharing_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  metric: text("metric").notNull(), // e.g. "sleepHours", "weight", "mood"
  shared: integer("shared").notNull().default(0), // 0 = private, 1 = shared with family
});

export const insertSharingPermissionSchema = createInsertSchema(sharingPermissions).omit({ id: true });
export type InsertSharingPermission = z.infer<typeof insertSharingPermissionSchema>;
export type SharingPermission = typeof sharingPermissions.$inferSelect;

// All possible shareable metrics
export const SHAREABLE_METRICS = [
  "sleepHours",
  "sleepQuality",
  "calories",
  "protein",
  "water",
  "exerciseMinutes",
  "exerciseType",
  "steps",
  "weight",
  "heartRate",
  "bloodPressureSystolic",
  "bloodPressureDiastolic",
  "mood",
  "energyLevel",
  "stressLevel",
] as const;
