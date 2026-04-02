import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

function resolveDatabaseFile() {
  if (process.env.DATABASE_FILE) {
    return path.isAbsolute(process.env.DATABASE_FILE)
      ? process.env.DATABASE_FILE
      : path.join(/*turbopackIgnore: true*/ process.cwd(), process.env.DATABASE_FILE);
  }

  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "career-tracker.db");
}

const databaseFile = resolveDatabaseFile();
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const sqlite = new Database(databaseFile);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

migrateLegacySingleUserTables();
createMultiUserTables();
ensureAppSettingsColumns();

export { databaseFile, sqlite as db };
export { normalizeBetterAuthSqliteTables };

function createMultiUserTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      userId TEXT PRIMARY KEY,
      sheetUrl TEXT,
      resumeUrl TEXT,
      githubUrl TEXT,
      leetcodeUrl TEXT,
      primaryGoal TEXT,
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
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_snapshots (
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
      PRIMARY KEY (userId, dateKey),
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dsa_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      snapshotDateKey TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      pattern TEXT NOT NULL,
      insight TEXT,
      repositoryUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId, snapshotDateKey) REFERENCES daily_snapshots(userId, dateKey) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS build_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      snapshotDateKey TEXT NOT NULL,
      title TEXT NOT NULL,
      area TEXT NOT NULL,
      proof TEXT,
      impact TEXT,
      repositoryUrl TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId, snapshotDateKey) REFERENCES daily_snapshots(userId, dateKey) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS application_entries (
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
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId, snapshotDateKey) REFERENCES daily_snapshots(userId, dateKey) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS planner_tasks (
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
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dsa_entries_user_created ON dsa_entries(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_build_entries_user_created ON build_entries(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_application_entries_user_created ON application_entries(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_application_entries_user_synced ON application_entries(userId, syncedToSheet);
    CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date ON daily_snapshots(userId, dateKey DESC);
    CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_scope_status ON planner_tasks(userId, scope, status, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_target_date ON planner_tasks(userId, targetDateKey);

    CREATE TABLE IF NOT EXISTS user_ai_credentials (
      userId TEXT NOT NULL,
      provider TEXT NOT NULL,
      encryptedApiKey TEXT NOT NULL,
      keyHint TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, provider),
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );
  `);
}

function ensureAppSettingsColumns() {
  ensureColumn("app_settings", "linkedinUrl", "TEXT");
  ensureColumn("app_settings", "portfolioUrl", "TEXT");
  ensureColumn("app_settings", "codeforcesUrl", "TEXT");
  ensureColumn("app_settings", "codechefUrl", "TEXT");
  ensureColumn("app_settings", "hackerrankUrl", "TEXT");
  ensureColumn("app_settings", "jobTrackerUrl", "TEXT");
  ensureColumn("app_settings", "targetRole", "TEXT");
  ensureColumn("app_settings", "targetCompanies", "TEXT");
  ensureColumn("app_settings", "university", "TEXT");
  ensureColumn("app_settings", "degree", "TEXT");
  ensureColumn("app_settings", "graduationYear", "TEXT");
  ensureColumn("app_settings", "planStyle", "TEXT");
  ensureColumn("app_settings", "customAiInstructions", "TEXT");
  ensureColumn(
    "app_settings",
    "weekdayDeepWorkMinutes",
    "INTEGER NOT NULL DEFAULT 75",
  );
  ensureColumn(
    "app_settings",
    "weekdaySupportMinutes",
    "INTEGER NOT NULL DEFAULT 35",
  );
  ensureColumn(
    "app_settings",
    "weekdayTaskTarget",
    "INTEGER NOT NULL DEFAULT 3",
  );
  ensureColumn(
    "app_settings",
    "weekendTaskTarget",
    "INTEGER NOT NULL DEFAULT 5",
  );
  ensureColumn("app_settings", "weeklyTheme", "TEXT");
}

function migrateLegacySingleUserTables() {
  renameIfLegacy("app_settings", ["id"]);
  renameIfLegacy("daily_snapshots", ["dateKey"], ["userId"]);
  renameIfLegacy("dsa_entries", ["snapshotDateKey"], ["userId"]);
  renameIfLegacy("build_entries", ["snapshotDateKey"], ["userId"]);
  renameIfLegacy("application_entries", ["snapshotDateKey"], ["userId"]);
}

function renameIfLegacy(
  table: string,
  requiredColumns: string[],
  missingColumns: string[] = [],
) {
  if (!hasTable(table) || hasTable(`legacy_${table}`)) {
    return;
  }

  const columns = getColumns(table);
  const isLegacy =
    requiredColumns.every((column) => columns.includes(column)) &&
    missingColumns.every((column) => !columns.includes(column));

  if (isLegacy) {
    sqlite.exec(`ALTER TABLE ${table} RENAME TO legacy_${table}`);
  }
}

function hasTable(table: string) {
  const row = sqlite
    .prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { name?: string } | undefined;

  return Boolean(row?.name);
}

function getColumns(table: string) {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  return rows.map((row) => row.name);
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = getColumns(table);
  if (!columns.includes(column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function normalizeBetterAuthSqliteTables() {
  if (!hasTable("rateLimit")) {
    return;
  }

  const columns = sqlite
    .prepare(`PRAGMA table_info(rateLimit)`)
    .all() as Array<{ name: string; type: string }>;
  const lastRequest = columns.find((column) => column.name === "lastRequest");

  if (!lastRequest || lastRequest.type.toLowerCase() !== "bigint") {
    return;
  }

  sqlite.exec(`
    ALTER TABLE rateLimit RENAME TO rateLimit_legacy_bigint;

    CREATE TABLE rateLimit (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      count INTEGER NOT NULL,
      lastRequest INTEGER NOT NULL
    );

    INSERT INTO rateLimit (id, key, count, lastRequest)
    SELECT id, key, count, CAST(lastRequest AS INTEGER)
    FROM rateLimit_legacy_bigint;

    DROP TABLE rateLimit_legacy_bigint;
  `);
}
