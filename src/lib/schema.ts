import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Better Auth Tables (Standard Schema)
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// App Specific Tables
export const appSettings = sqliteTable("app_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sheetUrl: text("sheetUrl"),
  resumeUrl: text("resumeUrl"),
  githubUrl: text("githubUrl"),
  leetcodeUrl: text("leetcodeUrl"),
  linkedinUrl: text("linkedinUrl"),
  portfolioUrl: text("portfolioUrl"),
  codeforcesUrl: text("codeforcesUrl"),
  codechefUrl: text("codechefUrl"),
  hackerrankUrl: text("hackerrankUrl"),
  jobTrackerUrl: text("jobTrackerUrl"),
  primaryGoal: text("primaryGoal"),
  targetRole: text("targetRole"),
  targetCompanies: text("targetCompanies"),
  university: text("university"),
  degree: text("degree"),
  graduationYear: text("graduationYear"),
  planStyle: text("planStyle"),
  customAiInstructions: text("customAiInstructions"),
  aiProvider: text("aiProvider").notNull().default("openai"),
  googleAppsScriptUrl: text("googleAppsScriptUrl"),
  openAiModel: text("openAiModel").notNull().default("gpt-4o-mini"),
  weekendDsaMinutes: integer("weekendDsaMinutes").notNull().default(150),
  weekendBuildMinutes: integer("weekendBuildMinutes").notNull().default(180),
  weeklyDsaTarget: integer("weeklyDsaTarget").notNull().default(10),
  weeklyApplicationTarget: integer("weeklyApplicationTarget").notNull().default(5),
  weeklyBuildTarget: integer("weeklyBuildTarget").notNull().default(4),
  timerFocusMinutes: integer("timerFocusMinutes").notNull().default(50),
  timerBreakMinutes: integer("timerBreakMinutes").notNull().default(10),
  weekdayDeepWorkMinutes: integer("weekdayDeepWorkMinutes").notNull().default(75),
  weekdaySupportMinutes: integer("weekdaySupportMinutes").notNull().default(35),
  weekdayTaskTarget: integer("weekdayTaskTarget").notNull().default(3),
  weekendTaskTarget: integer("weekendTaskTarget").notNull().default(5),
  weeklyTheme: text("weeklyTheme"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dailySnapshots = sqliteTable("daily_snapshots", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  dateKey: text("dateKey").notNull(),
  morningRevision: integer("morningRevision").notNull().default(0),
  microRevision: integer("microRevision").notNull().default(0),
  deepWork: integer("deepWork").notNull().default(0),
  supportBlock: integer("supportBlock").notNull().default(0),
  shutdownReview: integer("shutdownReview").notNull().default(0),
  note: text("note"),
  tomorrowTask: text("tomorrowTask"),
  aiSummary: text("aiSummary"),
  aiBiggestRisk: text("aiBiggestRisk"),
  aiFocusTheme: text("aiFocusTheme"),
  aiMorningPlan: text("aiMorningPlan"),
  aiNightPlan: text("aiNightPlan"),
  aiApplyPlan: text("aiApplyPlan"),
  aiOneCut: text("aiOneCut"),
  aiWeekendMission: text("aiWeekendMission"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.dateKey] }),
}));

export const dsaEntries = sqliteTable("dsa_entries", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  snapshotDateKey: text("snapshotDateKey").notNull(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  pattern: text("pattern").notNull(),
  insight: text("insight"),
  repositoryUrl: text("repositoryUrl"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const buildEntries = sqliteTable("build_entries", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  snapshotDateKey: text("snapshotDateKey").notNull(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  proof: text("proof"),
  impact: text("impact"),
  repositoryUrl: text("repositoryUrl"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const applicationEntries = sqliteTable("application_entries", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  snapshotDateKey: text("snapshotDateKey").notNull(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  roleUrl: text("roleUrl"),
  syncedToSheet: integer("syncedToSheet").notNull().default(0),
  syncedAt: text("syncedAt"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const plannerTasks = sqliteTable("planner_tasks", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  details: text("details"),
  scope: text("scope").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull().default("todo"),
  estimateMinutes: integer("estimateMinutes").notNull().default(45),
  targetDateKey: text("targetDateKey"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const userAiCredentials = sqliteTable("user_ai_credentials", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  encryptedApiKey: text("encryptedApiKey").notNull(),
  keyHint: text("keyHint"),
  createdAt: text("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.provider] }),
}));
