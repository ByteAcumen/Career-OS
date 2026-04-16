import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getEnvValue } from "@/lib/env";
import * as schema from "./schema";

type RequestLike = {
  url: string | URL;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

type DuplexRequestInit = RequestInit & {
  duplex?: "half";
};

function isRequestLike(input: unknown): input is RequestLike {
  return typeof input === "object" && input !== null && "url" in input;
}

const customFetch: typeof fetch = async (input, init) => {
  let requestUrl: string | URL = input instanceof URL ? input : String(input);
  let requestInit: DuplexRequestInit | undefined = init
    ? { ...init }
    : undefined;

  if (isRequestLike(input)) {
    const body = input.body ?? init?.body;
    requestUrl = input.url;
    requestInit = {
      ...init,
      method: input.method ?? init?.method,
      headers: input.headers ?? init?.headers,
      body,
    };

    if (body) {
      requestInit.duplex = "half";
    }
  }

  const response = await fetch(
    requestUrl instanceof URL ? requestUrl.toString() : requestUrl,
    requestInit,
  );

  const bodyStream = response.body as (ReadableStream<Uint8Array> & {
    cancel?: () => Promise<void>;
  }) | null;

  if (bodyStream && typeof bodyStream.cancel !== "function") {
    bodyStream.cancel = async () => Promise.resolve();
  }

  return response;
};

// We provide a dummy URL for the build phase to prevent 'URL_INVALID' from libsql.
// The actual queries will fail gracefully if the real URL is missing at runtime.
const url = getEnvValue("TURSO_DATABASE_URL") || "libsql://build-placeholder.turso.io";
const authToken = getEnvValue("TURSO_AUTH_TOKEN");
const isBuildPlaceholder = url.includes("build-placeholder");

export const client = createClient({
  url,
  authToken,
  fetch: customFetch,
});

export const db = drizzle(client, { schema });

let _initialized = false;

export async function initializeSchema() {
  if (_initialized) return;
  _initialized = true;

  // We skip schema initialization during the build phase (detected via placeholder URL)
  // this prevents Turso connection errors during static-rendering.
  if (isBuildPlaceholder) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "Skipping Turso schema initialization because TURSO_DATABASE_URL is not configured.",
      );
    }
    console.log("Skipping Turso schema initialization (Build Phase)");
    return;
  }

  try {
    console.log("Initializing Turso schema...");

    await client.batch([
      `CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        emailVerified INTEGER NOT NULL DEFAULT 0,
        twoFactorEnabled INTEGER NOT NULL DEFAULT 0,
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
      `CREATE TABLE IF NOT EXISTS twoFactor (
        id TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        backupCodes TEXT NOT NULL,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
      );`,
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
      );`,
      `CREATE TABLE IF NOT EXISTS ai_artifacts (
        userId TEXT NOT NULL,
        feature TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        payload TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, feature, fingerprint)
      );`,
      `CREATE TABLE IF NOT EXISTS assistant_conversations (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New chat',
        lastPreview TEXT,
        pageContext TEXT NOT NULL DEFAULT 'home',
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS assistant_messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
        userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date
       ON daily_snapshots (userId, dateKey);`,
      `CREATE INDEX IF NOT EXISTS idx_dsa_entries_user_date
       ON dsa_entries (userId, snapshotDateKey);`,
      `CREATE INDEX IF NOT EXISTS idx_build_entries_user_date
       ON build_entries (userId, snapshotDateKey);`,
      `CREATE INDEX IF NOT EXISTS idx_application_entries_user_date
       ON application_entries (userId, snapshotDateKey);`,
      `CREATE INDEX IF NOT EXISTS idx_application_entries_user_sync
       ON application_entries (userId, syncedToSheet);`,
      `CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_status
       ON planner_tasks (userId, status);`,
      `CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_scope
       ON planner_tasks (userId, scope);`,
      `CREATE INDEX IF NOT EXISTS idx_ai_artifacts_user_feature_updated
       ON ai_artifacts (userId, feature, updatedAt);`,
      `CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_updated
       ON assistant_conversations (userId, updatedAt);`,
      `CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_created
       ON assistant_messages (conversationId, createdAt);`,
      `CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_conversation
       ON assistant_messages (userId, conversationId);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_two_factor_user_id
       ON twoFactor (userId);`,
      `CREATE INDEX IF NOT EXISTS idx_two_factor_secret
       ON twoFactor (secret);`,
    ], "write");

    const additiveStatements = [
      `ALTER TABLE user ADD COLUMN twoFactorEnabled INTEGER NOT NULL DEFAULT 0;`,
    ];

    for (const statement of additiveStatements) {
      try {
        await client.execute(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        if (
          message.includes("duplicate column name") ||
          message.includes("already exists")
        ) {
          continue;
        }

        throw error;
      }
    }

    console.log("Turso schema initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Turso schema:", err);
  }
}

