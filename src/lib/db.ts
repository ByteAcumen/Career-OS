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

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sheetUrl TEXT,
    resumeUrl TEXT,
    githubUrl TEXT,
    googleAppsScriptUrl TEXT,
    openAiModel TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    weekendDsaMinutes INTEGER NOT NULL DEFAULT 150,
    weekendBuildMinutes INTEGER NOT NULL DEFAULT 180,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_snapshots (
    dateKey TEXT PRIMARY KEY,
    morningRevision INTEGER NOT NULL DEFAULT 0,
    microRevision INTEGER NOT NULL DEFAULT 0,
    deepWork INTEGER NOT NULL DEFAULT 0,
    supportBlock INTEGER NOT NULL DEFAULT 0,
    shutdownReview INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    tomorrowTask TEXT,
    aiSummary TEXT,
    aiBiggestRisk TEXT,
    aiMorningPlan TEXT,
    aiNightPlan TEXT,
    aiApplyPlan TEXT,
    aiOneCut TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dsa_entries (
    id TEXT PRIMARY KEY,
    snapshotDateKey TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    pattern TEXT NOT NULL,
    insight TEXT,
    repositoryUrl TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshotDateKey) REFERENCES daily_snapshots(dateKey) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS build_entries (
    id TEXT PRIMARY KEY,
    snapshotDateKey TEXT NOT NULL,
    title TEXT NOT NULL,
    area TEXT NOT NULL,
    proof TEXT,
    impact TEXT,
    repositoryUrl TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshotDateKey) REFERENCES daily_snapshots(dateKey) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS application_entries (
    id TEXT PRIMARY KEY,
    snapshotDateKey TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    roleUrl TEXT,
    syncedToSheet INTEGER NOT NULL DEFAULT 0,
    syncedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (snapshotDateKey) REFERENCES daily_snapshots(dateKey) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_dsa_entries_createdAt ON dsa_entries(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_build_entries_createdAt ON build_entries(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_application_entries_createdAt ON application_entries(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_application_entries_synced ON application_entries(syncedToSheet);
`);

ensureColumn("app_settings", "leetcodeUrl", "TEXT");
ensureColumn("app_settings", "primaryGoal", "TEXT");
ensureColumn("app_settings", "aiProvider", "TEXT");

export { databaseFile, sqlite as db };

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((item) => item.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
