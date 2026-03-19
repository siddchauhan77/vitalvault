import { pgTable, text, integer, real, serial, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Daily health log - the core data model
export const healthLogs = pgTable("health_logs", {
  id: serial("id").primaryKey(),
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

// Health goals
export const healthGoals = pgTable("health_goals", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull(), // e.g. "steps", "water", "sleepHours"
  target: real("target").notNull(),
  unit: text("unit").notNull(),
  isActive: integer("is_active").notNull().default(1), // 1 or 0
});

export const insertHealthGoalSchema = createInsertSchema(healthGoals).omit({ id: true });
export type InsertHealthGoal = z.infer<typeof insertHealthGoalSchema>;
export type HealthGoal = typeof healthGoals.$inferSelect;

// Keep the user table for template compatibility
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
