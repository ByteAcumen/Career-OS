import { randomUUID } from "node:crypto";

import { startOfWeek, subDays } from "date-fns";

import { db } from "@/lib/db";
import { fetchGithubActivity } from "@/lib/github";
import type { DashboardData } from "@/lib/types";
import { previousDateKey, toDateKey } from "@/lib/utils";

type SnapshotRow = {
  dateKey: string;
  morningRevision: number;
  microRevision: number;
  deepWork: number;
  supportBlock: number;
  shutdownReview: number;
  note: string | null;
  tomorrowTask: string | null;
  aiSummary: string | null;
  aiBiggestRisk: string | null;
  aiMorningPlan: string | null;
  aiNightPlan: string | null;
  aiApplyPlan: string | null;
  aiOneCut: string | null;
};

const defaultSettings = {
  sheetUrl:
    "https://docs.google.com/spreadsheets/d/1AtdZ8s5U5VgGOH4O7IIBVnc_Gdq3tef1rp4dJfPgNFA/edit?gid=0#gid=0",
  resumeUrl: "https://www.overleaf.com/project/69c93e4ef81662db852a5d8f",
  githubUrl: "https://github.com/ByteAcumen",
  leetcodeUrl: "https://leetcode.com/u/hemant_hk/",
  primaryGoal: "MAANG-ready Java DSA + React + NestJS + AI portfolio",
  aiProvider: "openai" as const,
  googleAppsScriptUrl: "",
  openAiModel: "gpt-4o-mini",
  weekendDsaMinutes: 150,
  weekendBuildMinutes: 180,
};

export function ensureSettings() {
  const existing = db
    .prepare(
      `SELECT sheetUrl, resumeUrl, githubUrl, leetcodeUrl, primaryGoal, aiProvider, googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes
       FROM app_settings WHERE id = 1`,
    )
    .get() as DashboardData["settings"] | undefined;

  if (existing) {
    return normalizeSettings(existing);
  }

  db.prepare(
    `INSERT INTO app_settings
      (id, sheetUrl, resumeUrl, githubUrl, leetcodeUrl, primaryGoal, aiProvider, googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes)
     VALUES (1, @sheetUrl, @resumeUrl, @githubUrl, @leetcodeUrl, @primaryGoal, @aiProvider, @googleAppsScriptUrl, @openAiModel, @weekendDsaMinutes, @weekendBuildMinutes)`,
  ).run(defaultSettings);

  return defaultSettings;
}

export function saveSettings(settings: DashboardData["settings"]) {
  ensureSettings();
  db.prepare(
    `UPDATE app_settings
      SET sheetUrl = @sheetUrl,
          resumeUrl = @resumeUrl,
          githubUrl = @githubUrl,
          leetcodeUrl = @leetcodeUrl,
          primaryGoal = @primaryGoal,
          aiProvider = @aiProvider,
          googleAppsScriptUrl = @googleAppsScriptUrl,
          openAiModel = @openAiModel,
          weekendDsaMinutes = @weekendDsaMinutes,
          weekendBuildMinutes = @weekendBuildMinutes,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = 1`,
  ).run(settings);

  return normalizeSettings(settings);
}

export function ensureSnapshot(dateKey = toDateKey()) {
  db.prepare(
    `INSERT INTO daily_snapshots (dateKey)
     VALUES (?)
     ON CONFLICT(dateKey) DO NOTHING`,
  ).run(dateKey);

  return getSnapshotOrThrow(dateKey);
}

export function updateCheckin(dateKey: string, key: string, value: boolean) {
  ensureSnapshot(dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET ${key} = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE dateKey = ?`,
  ).run(value ? 1 : 0, dateKey);

  return getSnapshot(dateKey);
}

export function saveReview(dateKey: string, note: string, tomorrowTask: string) {
  ensureSnapshot(dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET note = ?, tomorrowTask = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE dateKey = ?`,
  ).run(note || null, tomorrowTask || null, dateKey);

  return getSnapshot(dateKey);
}

export function createDsaEntry(input: {
  dateKey: string;
  title: string;
  difficulty: string;
  pattern: string;
  insight?: string;
  repositoryUrl?: string;
}) {
  ensureSnapshot(input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO dsa_entries
      (id, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.dateKey,
    input.title,
    input.difficulty,
    input.pattern,
    input.insight || null,
    input.repositoryUrl || null,
  );

  return { id, ...input };
}

export function createBuildEntry(input: {
  dateKey: string;
  title: string;
  area: string;
  proof?: string;
  impact?: string;
  repositoryUrl?: string;
}) {
  ensureSnapshot(input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO build_entries
      (id, snapshotDateKey, title, area, proof, impact, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.dateKey,
    input.title,
    input.area,
    input.proof || null,
    input.impact || null,
    input.repositoryUrl || null,
  );

  return { id, ...input };
}

export function createApplicationEntry(input: {
  dateKey: string;
  company: string;
  role: string;
  status: string;
  note?: string;
  roleUrl?: string;
}) {
  ensureSnapshot(input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO application_entries
      (id, snapshotDateKey, company, role, status, note, roleUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.dateKey,
    input.company,
    input.role,
    input.status,
    input.note || null,
    input.roleUrl || null,
  );

  return { id, ...input };
}

export function getPendingApplicationsForSync() {
  return db
    .prepare(
      `SELECT id, snapshotDateKey, company, role, status, note, roleUrl, createdAt
       FROM application_entries
       WHERE syncedToSheet = 0
       ORDER BY createdAt ASC`,
    )
    .all() as Array<{
    id: string;
    snapshotDateKey: string;
    company: string;
    role: string;
    status: string;
    note: string | null;
    roleUrl: string | null;
    createdAt: string;
  }>;
}

export function markApplicationSynced(id: string) {
  db.prepare(
    `UPDATE application_entries
      SET syncedToSheet = 1, syncedAt = CURRENT_TIMESTAMP
      WHERE id = ?`,
  ).run(id);
}

export function saveCoachResponse(
  dateKey: string,
  coach: {
    summary: string;
    biggestRisk: string;
    morningPlan: string;
    nightPlan: string;
    applyPlan: string;
    oneCut: string;
  },
) {
  ensureSnapshot(dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET aiSummary = ?, aiBiggestRisk = ?, aiMorningPlan = ?, aiNightPlan = ?, aiApplyPlan = ?, aiOneCut = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE dateKey = ?`,
  ).run(
    coach.summary,
    coach.biggestRisk,
    coach.morningPlan,
    coach.nightPlan,
    coach.applyPlan,
    coach.oneCut,
    dateKey,
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  const settings = ensureSettings();
  const todayKey = toDateKey();
  const today = ensureSnapshot(todayKey);
  const previous = getSnapshot(previousDateKey());
  const history = db
    .prepare(
      `SELECT *
       FROM daily_snapshots
       WHERE dateKey >= ?
       ORDER BY dateKey ASC`,
    )
    .all(toDateKey(subDays(new Date(), 13))) as SnapshotRow[];

  const recentDsa = db
    .prepare(
      `SELECT id, title, difficulty, pattern, insight, repositoryUrl, createdAt
       FROM dsa_entries
       ORDER BY createdAt DESC
       LIMIT 6`,
    )
    .all() as DashboardData["recentDsa"];

  const recentBuilds = db
    .prepare(
      `SELECT id, title, area, proof, impact, repositoryUrl, createdAt
       FROM build_entries
       ORDER BY createdAt DESC
       LIMIT 6`,
    )
    .all() as DashboardData["recentBuilds"];

  const rawApplications = db
    .prepare(
      `SELECT id, company, role, status, note, roleUrl, syncedToSheet, createdAt
       FROM application_entries
       ORDER BY createdAt DESC
       LIMIT 8`,
    )
    .all() as Array<
    Omit<DashboardData["recentApplications"][number], "syncedToSheet"> & {
      syncedToSheet: number;
    }
  >;

  const recentApplications = rawApplications
    .map((item) => ({
      ...item,
      syncedToSheet: Boolean((item as { syncedToSheet: number }).syncedToSheet),
    }));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekSnapshots = history.filter(
    (item) => new Date(`${item.dateKey}T00:00:00`) >= weekStart,
  );

  const metrics = {
    revisionStreak: calculateRevisionStreak(history),
    weekDsa: currentWeekSnapshots.reduce(
      (sum, item) => sum + getCount("dsa_entries", item.dateKey),
      0,
    ),
    weekApplications: currentWeekSnapshots.reduce(
      (sum, item) => sum + getCount("application_entries", item.dateKey),
      0,
    ),
    weekBuilds: currentWeekSnapshots.reduce(
      (sum, item) => sum + getCount("build_entries", item.dateKey),
      0,
    ),
    todayScore: calculateTodayScore(today),
    syncedApplications: getBooleanCount("application_entries", "syncedToSheet", true),
    pendingApplications: getBooleanCount("application_entries", "syncedToSheet", false),
  };

  const githubActivity = await fetchGithubActivity(settings.githubUrl);

  return {
    settings,
    metrics,
    integrations: {
      aiReady: isAiProviderReady(settings.aiProvider),
      googleSheetsReady: Boolean(settings.googleAppsScriptUrl),
      providers: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      },
    },
    today: mapToday(today),
    previousDay: previous
      ? {
          dateKey: previous.dateKey,
          dsaCount: getCount("dsa_entries", previous.dateKey),
          buildCount: getCount("build_entries", previous.dateKey),
          appCount: getCount("application_entries", previous.dateKey),
          note: previous.note ?? "",
        }
      : null,
    recentDsa,
    recentBuilds,
    recentApplications,
    githubActivity,
    history: history.map((item) => ({
      dateKey: item.dateKey,
      completedCount: calculateCompletedCount(item),
      dsaCount: getCount("dsa_entries", item.dateKey),
      buildCount: getCount("build_entries", item.dateKey),
      appCount: getCount("application_entries", item.dateKey),
    })),
  };
}

function getSnapshot(dateKey: string) {
  return db
    .prepare(`SELECT * FROM daily_snapshots WHERE dateKey = ?`)
    .get(dateKey) as SnapshotRow | undefined;
}

function getSnapshotOrThrow(dateKey: string) {
  const snapshot = getSnapshot(dateKey);
  if (!snapshot) {
    throw new Error(`Snapshot not found for ${dateKey}`);
  }
  return snapshot;
}

function getCount(table: "dsa_entries" | "build_entries" | "application_entries", dateKey: string) {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE snapshotDateKey = ?`)
    .get(dateKey) as { count: number };
  return row.count;
}

function getBooleanCount(
  table: "application_entries",
  column: "syncedToSheet",
  value: boolean,
) {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`)
    .get(value ? 1 : 0) as { count: number };
  return row.count;
}

function normalizeSettings(input: Partial<DashboardData["settings"]>) {
  return {
    sheetUrl: input.sheetUrl ?? defaultSettings.sheetUrl,
    resumeUrl: input.resumeUrl ?? defaultSettings.resumeUrl,
    githubUrl: input.githubUrl ?? defaultSettings.githubUrl,
    leetcodeUrl: input.leetcodeUrl ?? defaultSettings.leetcodeUrl,
    primaryGoal: input.primaryGoal ?? defaultSettings.primaryGoal,
    aiProvider: input.aiProvider ?? defaultSettings.aiProvider,
    googleAppsScriptUrl: input.googleAppsScriptUrl ?? defaultSettings.googleAppsScriptUrl,
    openAiModel: input.openAiModel ?? defaultSettings.openAiModel,
    weekendDsaMinutes: Number(input.weekendDsaMinutes ?? defaultSettings.weekendDsaMinutes),
    weekendBuildMinutes: Number(input.weekendBuildMinutes ?? defaultSettings.weekendBuildMinutes),
  };
}

function isAiProviderReady(provider: DashboardData["settings"]["aiProvider"]) {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function mapToday(snapshot: SnapshotRow): DashboardData["today"] {
  return {
    dateKey: snapshot.dateKey,
    checkins: {
      morningRevision: Boolean(snapshot.morningRevision),
      microRevision: Boolean(snapshot.microRevision),
      deepWork: Boolean(snapshot.deepWork),
      supportBlock: Boolean(snapshot.supportBlock),
      shutdownReview: Boolean(snapshot.shutdownReview),
    },
    note: snapshot.note ?? "",
    tomorrowTask: snapshot.tomorrowTask ?? "",
    ai:
      snapshot.aiSummary &&
      snapshot.aiBiggestRisk &&
      snapshot.aiMorningPlan &&
      snapshot.aiNightPlan &&
      snapshot.aiApplyPlan &&
      snapshot.aiOneCut
        ? {
            summary: snapshot.aiSummary,
            biggestRisk: snapshot.aiBiggestRisk,
            morningPlan: snapshot.aiMorningPlan,
            nightPlan: snapshot.aiNightPlan,
            applyPlan: snapshot.aiApplyPlan,
            oneCut: snapshot.aiOneCut,
          }
        : null,
  };
}

function calculateCompletedCount(snapshot: SnapshotRow) {
  return [
    snapshot.morningRevision,
    snapshot.microRevision,
    snapshot.deepWork,
    snapshot.supportBlock,
    snapshot.shutdownReview,
  ].filter(Boolean).length;
}

function calculateTodayScore(snapshot: SnapshotRow) {
  return Math.round((calculateCompletedCount(snapshot) / 5) * 100);
}

function calculateRevisionStreak(snapshots: SnapshotRow[]) {
  let streak = 0;

  for (let i = snapshots.length - 1; i >= 0; i -= 1) {
    if (snapshots[i]?.morningRevision) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}
