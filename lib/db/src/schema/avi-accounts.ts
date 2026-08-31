import { date, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface AviAchievementState {
  unlockedIds: string[];
  counters: Record<string, number>;
}

const defaultAchievements: AviAchievementState = {
  unlockedIds: [],
  counters: {},
};

export const aviAccounts = pgTable("avi_accounts", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  aviName: text("avi_name").notNull().default("AVI"),
  avatar: text("avatar").notNull().default("🤖"),
  profileBio: text("profile_bio").notNull().default(""),
  achievementState: jsonb("achievement_state")
    .$type<AviAchievementState>()
    .notNull()
    .default(defaultAchievements),
  parentModeEnabled: text("parent_mode_enabled").notNull().default("false"),
  dailyLimit: integer("daily_limit").notNull().default(100),
  parentPinHash: text("parent_pin_hash"),
  parentPinSalt: text("parent_pin_salt"),
  dailyMessageDate: date("daily_message_date", { mode: "string" }),
  dailyMessageCount: integer("daily_message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const insertAviAccountSchema = createInsertSchema(aviAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AviAccount = typeof aviAccounts.$inferSelect;
export type InsertAviAccount = z.infer<typeof insertAviAccountSchema>;