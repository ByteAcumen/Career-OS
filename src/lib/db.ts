import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN;

// We don't throw here anymore to allow 'next build' to complete static analysis.
// If the URL is truly missing at runtime, the libsql client will throw a descriptive error when a query is made.

export const client = createClient({
  url: url,
  authToken,
});

export const db = drizzle(client, { schema });

let _initialized = false;

export async function initializeSchema() {
  if (_initialized) return;
  _initialized = true;

  // Since we're using a serverless DB, we want to ensure tables exist.
  // In a full production app, you'd use 'drizzle-kit push' or 'migrate'.
  // For this migration, we'll run the creation logic once.
  
  try {
    console.log("Initializing Turso schema...");
    
    // We can use client.execute() for raw DDL
    await client.batch([
      // Better Auth tables - must be created before auth can function
      `CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      );`,
      `CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expiresAt INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        accessToken TEXT,
        refreshToken TEXT,
        idToken TEXT,
        accessTokenExpiresAt INTEGER,
        refreshTokenExpiresAt INTEGER,
        scope TEXT,
        password TEXT,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      );`,
      `CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt INTEGER NOT NULL,
        createdAt INTEGER DEFAULT (unixepoch()),
        updatedAt INTEGER DEFAULT (unixepoch())
      );`,
      // App-specific tables
      `CREATE TABLE IF NOT EXISTS app_settings (
        userId TEXT PRIMARY KEY,
        sheetUrl TEXT,
        resumeUrl TEXT,
        githubUrl TEXT,
        leetcodeUrl TEXT,
        linkedinUrl TEXT,
        portfolioUrl TEXT,
        codeforcesUrl TEXT,
        codechefUrl TEXT,
        hackerrankUrl TEXT,
        jobTrackerUrl TEXT,
        primaryGoal TEXT,
        targetRole TEXT,
        targetCompanies TEXT,
        university TEXT,
        degree TEXT,
        graduationYear TEXT,
        planStyle TEXT,
        customAiInstructions TEXT,
        aiProvider TEXT NOT NULL DEFAULT 'openai',
        googleAppsScriptUrl TEXT,
        openAiModel TEXT NOT NULL DEFAULT 'gpt-4o-mini',
        weekendDsaMinutes INTEGER NOT NULL DEFAULT 150,
        weekendBuildMinutes INTEGER NOT NULL DEFAULT 180,
        weeklyDsaTarget INTEGER NOT NULL DEFAULT 10,
        weeklyApplicationTarget INTEGER NOT NULL DEFAULT 5,
        weeklyBuildTarget INTEGER NOT NULL DEFAULT 4,
        timerFocusMinutes INTEGER NOT NULL DEFAULT 50,
        timerBreakMinutes INTEGER NOT NULL DEFAULT 10,
        weekdayDeepWorkMinutes INTEGER NOT NULL DEFAULT 75,
        weekdaySupportMinutes INTEGER NOT NULL DEFAULT 35,
        weekdayTaskTarget INTEGER NOT NULL DEFAULT 3,
        weekendTaskTarget INTEGER NOT NULL DEFAULT 5,
        weeklyTheme TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS daily_snapshots (
        userId TEXT NOT NULL,
        dateKey TEXT NOT NULL,
        morningRevision INTEGER NOT NULL DEFAULT 0,
        microRevision INTEGER NOT NULL DEFAULT 0,
        deepWork INTEGER NOT NULL DEFAULT 0,
        supportBlock INTEGER NOT NULL DEFAULT 0,
        shutdownReview INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        tomorrowTask TEXT,
        aiSummary TEXT,
        aiBiggestRisk TEXT,
        aiFocusTheme TEXT,
        aiMorningPlan TEXT,
        aiNightPlan TEXT,
        aiApplyPlan TEXT,
        aiOneCut TEXT,
        aiWeekendMission TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, dateKey)
      );`,
      `CREATE TABLE IF NOT EXISTS dsa_entries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        snapshotDateKey TEXT NOT NULL,
        title TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        pattern TEXT NOT NULL,
        insight TEXT,
        repositoryUrl TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS build_entries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        snapshotDateKey TEXT NOT NULL,
        title TEXT NOT NULL,
        area TEXT NOT NULL,
        proof TEXT,
        impact TEXT,
        repositoryUrl TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS application_entries (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        snapshotDateKey TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT,
        roleUrl TEXT,
        syncedToSheet INTEGER NOT NULL DEFAULT 0,
        syncedAt TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS planner_tasks (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT,
        scope TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        estimateMinutes INTEGER NOT NULL DEFAULT 45,
        targetDateKey TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS user_ai_credentials (
        userId TEXT NOT NULL,
        provider TEXT NOT NULL,
        encryptedApiKey TEXT NOT NULL,
        keyHint TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, provider)
      );`
    ], "write");
    console.log("Turso schema initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Turso schema:", err);
  }
}
