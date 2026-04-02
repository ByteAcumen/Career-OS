import { randomUUID } from "node:crypto";

import { startOfWeek, subDays } from "date-fns";

import { getAiProviderStatus } from "@/lib/ai-credentials";
import { db } from "@/lib/db";
import { fetchGithubActivity } from "@/lib/github";
import type { DashboardData } from "@/lib/types";
import { previousDateKey, toDateKey } from "@/lib/utils";

type SnapshotRow = {
  userId: string;
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
  aiFocusTheme: string | null;
  aiMorningPlan: string | null;
  aiNightPlan: string | null;
  aiApplyPlan: string | null;
  aiOneCut: string | null;
  aiWeekendMission: string | null;
};

const defaultSettings = {
  sheetUrl: "",
  resumeUrl: "",
  githubUrl: "",
  leetcodeUrl: "",
  linkedinUrl: "",
  portfolioUrl: "",
  codeforcesUrl: "",
  codechefUrl: "",
  hackerrankUrl: "",
  jobTrackerUrl: "",
  primaryGoal:
    "Land a strong software engineering role through consistent DSA, project shipping, and deliberate applications.",
  targetRole: "Software Engineer",
  targetCompanies: "",
  university: "",
  degree: "",
  graduationYear: "",
  planStyle: "Structured, realistic, and student-focused.",
  customAiInstructions: "",
  aiProvider: "openai" as const,
  googleAppsScriptUrl: "",
  openAiModel: "gpt-4o-mini",
  weekendDsaMinutes: 150,
  weekendBuildMinutes: 180,
  weeklyDsaTarget: 10,
  weeklyApplicationTarget: 5,
  weeklyBuildTarget: 4,
  weekdayDeepWorkMinutes: 75,
  weekdaySupportMinutes: 35,
  weekdayTaskTarget: 3,
  weekendTaskTarget: 5,
  weeklyTheme: "",
  timerFocusMinutes: 50,
  timerBreakMinutes: 10,
  onboardingCompleted: false,
};

export function claimLegacyDataForUser(userId: string) {
  const userCount = db
    .prepare(`SELECT COUNT(*) as count FROM user`)
    .get() as { count: number };

  if (userCount.count > 1) {
    ensureSettings(userId);
    return;
  }

  const hasUserData = db
    .prepare(
      `SELECT EXISTS(
        SELECT 1 FROM daily_snapshots WHERE userId = ?
      ) as hasData`,
    )
    .get(userId) as { hasData: number };

  if (hasUserData.hasData) {
    ensureSettings(userId);
    return;
  }

  const legacySettingsTable = hasTable("legacy_app_settings");
  const legacySnapshotsTable = hasTable("legacy_daily_snapshots");
  const legacyDsaTable = hasTable("legacy_dsa_entries");
  const legacyBuildTable = hasTable("legacy_build_entries");
  const legacyApplicationsTable = hasTable("legacy_application_entries");

  if (!legacySettingsTable && !legacySnapshotsTable) {
    ensureSettings(userId);
    return;
  }

  const transaction = db.transaction(() => {
    if (legacySettingsTable) {
      const legacySettings = db
        .prepare(
          `SELECT sheetUrl, resumeUrl, githubUrl, leetcodeUrl, primaryGoal, aiProvider,
                  googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes,
                  weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget,
                  timerFocusMinutes, timerBreakMinutes
           FROM legacy_app_settings
           LIMIT 1`,
        )
        .get() as DashboardData["settings"] | undefined;

      if (legacySettings) {
        saveSettings(userId, normalizeSettings(legacySettings));
      }
    }

    if (legacySnapshotsTable) {
      db.prepare(
        `INSERT OR IGNORE INTO daily_snapshots
          (userId, dateKey, morningRevision, microRevision, deepWork, supportBlock, shutdownReview,
           note, tomorrowTask, aiSummary, aiBiggestRisk, aiFocusTheme, aiMorningPlan, aiNightPlan,
           aiApplyPlan, aiOneCut, aiWeekendMission, createdAt, updatedAt)
         SELECT ?, dateKey, morningRevision, microRevision, deepWork, supportBlock, shutdownReview,
                note, tomorrowTask, aiSummary, aiBiggestRisk, aiFocusTheme, aiMorningPlan, aiNightPlan,
                aiApplyPlan, aiOneCut, aiWeekendMission, createdAt, updatedAt
         FROM legacy_daily_snapshots`,
      ).run(userId);
    }

    if (legacyDsaTable) {
      db.prepare(
        `INSERT OR IGNORE INTO dsa_entries
          (id, userId, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl, createdAt)
         SELECT id, ?, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl, createdAt
         FROM legacy_dsa_entries`,
      ).run(userId);
    }

    if (legacyBuildTable) {
      db.prepare(
        `INSERT OR IGNORE INTO build_entries
          (id, userId, snapshotDateKey, title, area, proof, impact, repositoryUrl, createdAt)
         SELECT id, ?, snapshotDateKey, title, area, proof, impact, repositoryUrl, createdAt
         FROM legacy_build_entries`,
      ).run(userId);
    }

    if (legacyApplicationsTable) {
      db.prepare(
        `INSERT OR IGNORE INTO application_entries
          (id, userId, snapshotDateKey, company, role, status, note, roleUrl, syncedToSheet, syncedAt, createdAt)
         SELECT id, ?, snapshotDateKey, company, role, status, note, roleUrl, syncedToSheet, syncedAt, createdAt
         FROM legacy_application_entries`,
      ).run(userId);
    }
  });

  transaction();
  ensureSettings(userId);
}

export function ensureSettings(userId: string) {
  const existing = db
    .prepare(
      `SELECT sheetUrl, resumeUrl, githubUrl, leetcodeUrl, linkedinUrl, portfolioUrl, codeforcesUrl,
              codechefUrl, hackerrankUrl, jobTrackerUrl, primaryGoal, targetRole, targetCompanies,
              university, degree, graduationYear, planStyle, customAiInstructions, aiProvider,
              googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes,
              weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget, weekdayDeepWorkMinutes,
              weekdaySupportMinutes, weekdayTaskTarget, weekendTaskTarget, weeklyTheme,
              timerFocusMinutes, timerBreakMinutes
       FROM app_settings
       WHERE userId = ?`,
    )
    .get(userId) as DashboardData["settings"] | undefined;

  if (existing) {
    return normalizeSettings(existing);
  }

  db.prepare(
    `INSERT INTO app_settings
      (userId, sheetUrl, resumeUrl, githubUrl, leetcodeUrl, linkedinUrl, portfolioUrl, codeforcesUrl,
       codechefUrl, hackerrankUrl, jobTrackerUrl, primaryGoal, targetRole, targetCompanies, university, degree,
       graduationYear, planStyle, customAiInstructions, aiProvider, googleAppsScriptUrl, openAiModel,
       weekendDsaMinutes, weekendBuildMinutes, weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget,
       weekdayDeepWorkMinutes, weekdaySupportMinutes, weekdayTaskTarget, weekendTaskTarget, weeklyTheme,
       timerFocusMinutes, timerBreakMinutes)
     VALUES
      (@userId, @sheetUrl, @resumeUrl, @githubUrl, @leetcodeUrl, @linkedinUrl, @portfolioUrl, @codeforcesUrl,
       @codechefUrl, @hackerrankUrl, @jobTrackerUrl, @primaryGoal, @targetRole, @targetCompanies, @university, @degree,
       @graduationYear, @planStyle, @customAiInstructions, @aiProvider, @googleAppsScriptUrl, @openAiModel,
       @weekendDsaMinutes, @weekendBuildMinutes, @weeklyDsaTarget, @weeklyApplicationTarget, @weeklyBuildTarget,
       @weekdayDeepWorkMinutes, @weekdaySupportMinutes, @weekdayTaskTarget, @weekendTaskTarget, @weeklyTheme,
       @timerFocusMinutes, @timerBreakMinutes)`,
  ).run({
    userId,
    ...defaultSettings,
  });

  return defaultSettings;
}

export function saveSettings(
  userId: string,
  settings: Partial<DashboardData["settings"]>,
) {
  ensureSettings(userId);
  const normalized = normalizeSettings(settings);
  db.prepare(
    `UPDATE app_settings
      SET sheetUrl = @sheetUrl,
          resumeUrl = @resumeUrl,
          githubUrl = @githubUrl,
          leetcodeUrl = @leetcodeUrl,
          linkedinUrl = @linkedinUrl,
          portfolioUrl = @portfolioUrl,
          codeforcesUrl = @codeforcesUrl,
          codechefUrl = @codechefUrl,
          hackerrankUrl = @hackerrankUrl,
          jobTrackerUrl = @jobTrackerUrl,
          primaryGoal = @primaryGoal,
          targetRole = @targetRole,
          targetCompanies = @targetCompanies,
          university = @university,
          degree = @degree,
          graduationYear = @graduationYear,
          planStyle = @planStyle,
          customAiInstructions = @customAiInstructions,
          aiProvider = @aiProvider,
          googleAppsScriptUrl = @googleAppsScriptUrl,
          openAiModel = @openAiModel,
          weekendDsaMinutes = @weekendDsaMinutes,
          weekendBuildMinutes = @weekendBuildMinutes,
          weeklyDsaTarget = @weeklyDsaTarget,
          weeklyApplicationTarget = @weeklyApplicationTarget,
          weeklyBuildTarget = @weeklyBuildTarget,
          weekdayDeepWorkMinutes = @weekdayDeepWorkMinutes,
          weekdaySupportMinutes = @weekdaySupportMinutes,
          weekdayTaskTarget = @weekdayTaskTarget,
          weekendTaskTarget = @weekendTaskTarget,
          weeklyTheme = @weeklyTheme,
          timerFocusMinutes = @timerFocusMinutes,
          timerBreakMinutes = @timerBreakMinutes,
          updatedAt = CURRENT_TIMESTAMP
      WHERE userId = @userId`,
  ).run({
    userId,
    ...normalized,
  });

  return normalized;
}

export function ensureSnapshot(userId: string, dateKey = toDateKey()) {
  db.prepare(
    `INSERT INTO daily_snapshots (userId, dateKey)
     VALUES (?, ?)
     ON CONFLICT(userId, dateKey) DO NOTHING`,
  ).run(userId, dateKey);

  return getSnapshotOrThrow(userId, dateKey);
}

export function updateCheckin(userId: string, dateKey: string, key: string, value: boolean) {
  ensureSnapshot(userId, dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET ${key} = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
  ).run(value ? 1 : 0, userId, dateKey);

  return getSnapshot(userId, dateKey);
}

export function saveReview(
  userId: string,
  dateKey: string,
  note: string,
  tomorrowTask: string,
) {
  ensureSnapshot(userId, dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET note = ?, tomorrowTask = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
  ).run(note || null, tomorrowTask || null, userId, dateKey);

  return getSnapshot(userId, dateKey);
}

export function createDsaEntry(
  userId: string,
  input: {
    dateKey: string;
    title: string;
    difficulty: string;
    pattern: string;
    insight?: string;
    repositoryUrl?: string;
  },
) {
  ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO dsa_entries
      (id, userId, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.dateKey,
    input.title,
    input.difficulty,
    input.pattern,
    input.insight || null,
    input.repositoryUrl || null,
  );

  return { id, ...input };
}

export function createBuildEntry(
  userId: string,
  input: {
    dateKey: string;
    title: string;
    area: string;
    proof?: string;
    impact?: string;
    repositoryUrl?: string;
  },
) {
  ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO build_entries
      (id, userId, snapshotDateKey, title, area, proof, impact, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.dateKey,
    input.title,
    input.area,
    input.proof || null,
    input.impact || null,
    input.repositoryUrl || null,
  );

  return { id, ...input };
}

export function createApplicationEntry(
  userId: string,
  input: {
    dateKey: string;
    company: string;
    role: string;
    status: string;
    note?: string;
    roleUrl?: string;
  },
) {
  ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO application_entries
      (id, userId, snapshotDateKey, company, role, status, note, roleUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    input.dateKey,
    input.company,
    input.role,
    input.status,
    input.note || null,
    input.roleUrl || null,
  );

  return { id, ...input };
}

export function createPlannerTask(
  userId: string,
  input: {
    title: string;
    details?: string;
    scope: DashboardData["planner"]["tasks"][number]["scope"];
    category: DashboardData["planner"]["tasks"][number]["category"];
    priority: DashboardData["planner"]["tasks"][number]["priority"];
    estimateMinutes: number;
    targetDateKey?: string | null;
  },
) {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO planner_tasks
      (id, userId, title, details, scope, category, priority, status, estimateMinutes, targetDateKey)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
  ).run(
    id,
    userId,
    input.title,
    input.details || null,
    input.scope,
    input.category,
    input.priority,
    input.estimateMinutes,
    input.targetDateKey || null,
  );

  return getPlannerTaskOrThrow(userId, id);
}

export function updatePlannerTaskStatus(
  userId: string,
  id: string,
  status: DashboardData["planner"]["tasks"][number]["status"],
) {
  db.prepare(
    `UPDATE planner_tasks
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND id = ?`,
  ).run(status, userId, id);

  return getPlannerTaskOrThrow(userId, id);
}

export function deletePlannerTask(userId: string, id: string) {
  db.prepare(
    `DELETE FROM planner_tasks
     WHERE userId = ? AND id = ?`,
  ).run(userId, id);

  return { ok: true };
}

export function getPendingApplicationsForSync(userId: string) {
  return db
    .prepare(
      `SELECT id, snapshotDateKey, company, role, status, note, roleUrl, createdAt
       FROM application_entries
       WHERE userId = ? AND syncedToSheet = 0
       ORDER BY createdAt ASC`,
    )
    .all(userId) as Array<{
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

export function markApplicationSynced(userId: string, id: string) {
  db.prepare(
    `UPDATE application_entries
      SET syncedToSheet = 1, syncedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND id = ?`,
  ).run(userId, id);
}

export function saveCoachResponse(
  userId: string,
  dateKey: string,
  coach: {
    summary: string;
    biggestRisk: string;
    focusTheme: string;
    morningPlan: string;
    nightPlan: string;
    applyPlan: string;
    oneCut: string;
    weekendMission: string;
  },
) {
  ensureSnapshot(userId, dateKey);
  db.prepare(
    `UPDATE daily_snapshots
      SET aiSummary = ?, aiBiggestRisk = ?, aiFocusTheme = ?, aiMorningPlan = ?, aiNightPlan = ?, aiApplyPlan = ?, aiOneCut = ?, aiWeekendMission = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
  ).run(
    coach.summary,
    coach.biggestRisk,
    coach.focusTheme,
    coach.morningPlan,
    coach.nightPlan,
    coach.applyPlan,
    coach.oneCut,
    coach.weekendMission,
    userId,
    dateKey,
  );
}

export async function getDashboardData(
  userId: string,
  targetDateKey?: string,
): Promise<DashboardData> {
  const settings = ensureSettings(userId);
  const todayKey = targetDateKey ?? toDateKey();
  const today = ensureSnapshot(userId, todayKey);
  const previous = getSnapshot(
    userId,
    previousDateKey(1, new Date(`${todayKey}T12:00:00`)),
  );
  const history = db
    .prepare(
      `SELECT *
       FROM daily_snapshots
       WHERE userId = ? AND dateKey >= ?
       ORDER BY dateKey ASC`,
    )
    .all(userId, toDateKey(subDays(new Date(), 89))) as SnapshotRow[];

  const recentDsa = db
    .prepare(
      `SELECT id, title, difficulty, pattern, insight, repositoryUrl, createdAt
       FROM dsa_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 6`,
    )
    .all(userId) as DashboardData["recentDsa"];

  const recentBuilds = db
    .prepare(
      `SELECT id, title, area, proof, impact, repositoryUrl, createdAt
       FROM build_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 6`,
    )
    .all(userId) as DashboardData["recentBuilds"];

  const rawApplications = db
    .prepare(
      `SELECT id, company, role, status, note, roleUrl, syncedToSheet, createdAt
       FROM application_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 8`,
    )
    .all(userId) as Array<
    Omit<DashboardData["recentApplications"][number], "syncedToSheet"> & {
      syncedToSheet: number;
    }
  >;

  const recentApplications = rawApplications.map((item) => ({
    ...item,
    syncedToSheet: Boolean(item.syncedToSheet),
  }));

  const plannerTasks = db
    .prepare(
      `SELECT id, title, details, scope, category, priority, status, estimateMinutes, targetDateKey, createdAt, updatedAt
       FROM planner_tasks
       WHERE userId = ?
       ORDER BY
        CASE scope WHEN 'daily' THEN 0 WHEN 'weekly' THEN 1 ELSE 2 END,
        CASE status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        COALESCE(targetDateKey, '9999-12-31') ASC,
        updatedAt DESC
       LIMIT 36`,
    )
    .all(userId) as DashboardData["planner"]["tasks"];

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekSnapshots = history.filter(
    (item) => new Date(`${item.dateKey}T00:00:00`) >= weekStart,
  );

  let totalXP = 0;
  for (const item of history) {
    const dsaCount = getCount("dsa_entries", userId, item.dateKey);
    const buildCount = getCount("build_entries", userId, item.dateKey);
    const appCount = getCount("application_entries", userId, item.dateKey);
    const checks = calculateCompletedCount(item);
    totalXP += dsaCount * 15 + buildCount * 25 + appCount * 10 + checks * 5;
  }

  const currentLevel = Math.floor(totalXP / 250) + 1;
  const xpForCurrentLevel = (currentLevel - 1) * 250;
  const xpForNextLevel = currentLevel * 250;
  const levelProgress = Math.round(
    ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100,
  );

  const { currentStreak, maxStreak } = calculateActiveStreaks(userId, history);

  const weekDsa = currentWeekSnapshots.reduce(
    (sum, item) => sum + getCount("dsa_entries", userId, item.dateKey),
    0,
  );
  const weekApplications = currentWeekSnapshots.reduce(
    (sum, item) => sum + getCount("application_entries", userId, item.dateKey),
    0,
  );
  const weekBuilds = currentWeekSnapshots.reduce(
    (sum, item) => sum + getCount("build_entries", userId, item.dateKey),
    0,
  );

  const githubActivity = await fetchGithubActivity(settings.githubUrl);
  const providerStatus = getAiProviderStatus(userId);
  const plannerSummary = summarizePlannerTasks(plannerTasks, todayKey);

  return {
    settings,
    metrics: {
      revisionStreak: calculateRevisionStreak(history),
      currentStreak,
      maxStreak,
      totalXP,
      level: currentLevel,
      levelProgress,
      weekDsa,
      weekApplications,
      weekBuilds,
      todayScore: calculateTodayScore(today),
      syncedApplications: getBooleanCount(userId, true),
      pendingApplications: getBooleanCount(userId, false),
      targetProgress: {
        dsa: calculateTargetProgress(weekDsa, settings.weeklyDsaTarget),
        applications: calculateTargetProgress(
          weekApplications,
          settings.weeklyApplicationTarget,
        ),
        builds: calculateTargetProgress(weekBuilds, settings.weeklyBuildTarget),
      },
    },
    integrations: {
      aiReady: providerStatus.providers[settings.aiProvider],
      googleSheetsReady: Boolean(settings.googleAppsScriptUrl),
      providers: providerStatus.providers,
      providerSources: providerStatus.providerSources,
      savedApiKeys: providerStatus.savedApiKeys,
    },
    planner: {
      tasks: plannerTasks.map((task) => ({
        ...task,
        details: task.details ?? "",
        targetDateKey: task.targetDateKey ?? null,
      })),
      summary: plannerSummary,
    },
    today: mapToday(today),
    previousDay: previous
      ? {
          dateKey: previous.dateKey,
          dsaCount: getCount("dsa_entries", userId, previous.dateKey),
          buildCount: getCount("build_entries", userId, previous.dateKey),
          appCount: getCount("application_entries", userId, previous.dateKey),
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
      dsaCount: getCount("dsa_entries", userId, item.dateKey),
      buildCount: getCount("build_entries", userId, item.dateKey),
      appCount: getCount("application_entries", userId, item.dateKey),
    })),
  };
}

export function getDailyDetail(userId: string, dateKey: string) {
  const snapshot = getSnapshot(userId, dateKey);
  if (!snapshot) return null;

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
    aiSummary: snapshot.aiSummary ?? null,
    dsa: db
      .prepare(
        `SELECT id, title, difficulty, pattern, insight, repositoryUrl, createdAt
         FROM dsa_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
      )
      .all(userId, dateKey),
    builds: db
      .prepare(
        `SELECT id, title, area, proof, impact, repositoryUrl, createdAt
         FROM build_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
      )
      .all(userId, dateKey),
    applications: db
      .prepare(
        `SELECT id, company, role, status, note, roleUrl, syncedToSheet, createdAt
         FROM application_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
      )
      .all(userId, dateKey),
  };
}

function getSnapshot(userId: string, dateKey: string) {
  return db
    .prepare(
      `SELECT *
       FROM daily_snapshots
       WHERE userId = ? AND dateKey = ?`,
    )
    .get(userId, dateKey) as SnapshotRow | undefined;
}

function getSnapshotOrThrow(userId: string, dateKey: string) {
  const snapshot = getSnapshot(userId, dateKey);
  if (!snapshot) {
    throw new Error(`Snapshot not found for ${dateKey}`);
  }
  return snapshot;
}

function getCount(
  table: "dsa_entries" | "build_entries" | "application_entries",
  userId: string,
  dateKey: string,
) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM ${table}
       WHERE userId = ? AND snapshotDateKey = ?`,
    )
    .get(userId, dateKey) as { count: number };
  return row.count;
}

function getBooleanCount(userId: string, value: boolean) {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM application_entries
       WHERE userId = ? AND syncedToSheet = ?`,
    )
    .get(userId, value ? 1 : 0) as { count: number };
  return row.count;
}

function getPlannerTaskOrThrow(userId: string, id: string) {
  const task = db
    .prepare(
      `SELECT id, title, details, scope, category, priority, status, estimateMinutes, targetDateKey, createdAt, updatedAt
       FROM planner_tasks
       WHERE userId = ? AND id = ?`,
    )
    .get(userId, id) as DashboardData["planner"]["tasks"][number] | undefined;

  if (!task) {
    throw new Error("Planner task not found.");
  }

  return {
    ...task,
    details: task.details ?? "",
    targetDateKey: task.targetDateKey ?? null,
  };
}

function summarizePlannerTasks(
  tasks: DashboardData["planner"]["tasks"],
  todayKey: string,
) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const active = tasks.filter((task) => task.status !== "done").length;
  const todayOpen = tasks.filter((task) => {
    if (task.status === "done") return false;
    if (task.scope === "daily") {
      return !task.targetDateKey || task.targetDateKey === todayKey;
    }
    return true;
  }).length;

  const dailyTasks = tasks.filter((task) => task.scope === "daily");
  const weeklyTasks = tasks.filter((task) => task.scope === "weekly");
  const weekendTasks = tasks.filter((task) => task.scope === "weekend");

  return {
    total,
    completed,
    active,
    todayOpen,
    daily: {
      total: dailyTasks.length,
      completed: dailyTasks.filter((task) => task.status === "done").length,
    },
    weekly: {
      total: weeklyTasks.length,
      completed: weeklyTasks.filter((task) => task.status === "done").length,
    },
    weekend: {
      total: weekendTasks.length,
      completed: weekendTasks.filter((task) => task.status === "done").length,
    },
  };
}

function normalizeSettings(input: Partial<DashboardData["settings"]>) {
  const normalized = {
    sheetUrl: input.sheetUrl ?? defaultSettings.sheetUrl,
    resumeUrl: input.resumeUrl ?? defaultSettings.resumeUrl,
    githubUrl: input.githubUrl ?? defaultSettings.githubUrl,
    leetcodeUrl: input.leetcodeUrl ?? defaultSettings.leetcodeUrl,
    linkedinUrl: input.linkedinUrl ?? defaultSettings.linkedinUrl,
    portfolioUrl: input.portfolioUrl ?? defaultSettings.portfolioUrl,
    codeforcesUrl: input.codeforcesUrl ?? defaultSettings.codeforcesUrl,
    codechefUrl: input.codechefUrl ?? defaultSettings.codechefUrl,
    hackerrankUrl: input.hackerrankUrl ?? defaultSettings.hackerrankUrl,
    jobTrackerUrl: input.jobTrackerUrl ?? defaultSettings.jobTrackerUrl,
    primaryGoal: input.primaryGoal ?? defaultSettings.primaryGoal,
    targetRole: input.targetRole ?? defaultSettings.targetRole,
    targetCompanies: input.targetCompanies ?? defaultSettings.targetCompanies,
    university: input.university ?? defaultSettings.university,
    degree: input.degree ?? defaultSettings.degree,
    graduationYear: input.graduationYear ?? defaultSettings.graduationYear,
    planStyle: input.planStyle ?? defaultSettings.planStyle,
    customAiInstructions:
      input.customAiInstructions ?? defaultSettings.customAiInstructions,
    aiProvider: input.aiProvider ?? defaultSettings.aiProvider,
    googleAppsScriptUrl:
      input.googleAppsScriptUrl ?? defaultSettings.googleAppsScriptUrl,
    openAiModel: input.openAiModel ?? defaultSettings.openAiModel,
    weekendDsaMinutes: Number(
      input.weekendDsaMinutes ?? defaultSettings.weekendDsaMinutes,
    ),
    weekendBuildMinutes: Number(
      input.weekendBuildMinutes ?? defaultSettings.weekendBuildMinutes,
    ),
    weeklyDsaTarget: Number(
      input.weeklyDsaTarget ?? defaultSettings.weeklyDsaTarget,
    ),
    weeklyApplicationTarget: Number(
      input.weeklyApplicationTarget ?? defaultSettings.weeklyApplicationTarget,
    ),
    weeklyBuildTarget: Number(
      input.weeklyBuildTarget ?? defaultSettings.weeklyBuildTarget,
    ),
    weekdayDeepWorkMinutes: Number(
      input.weekdayDeepWorkMinutes ?? defaultSettings.weekdayDeepWorkMinutes,
    ),
    weekdaySupportMinutes: Number(
      input.weekdaySupportMinutes ?? defaultSettings.weekdaySupportMinutes,
    ),
    weekdayTaskTarget: Number(
      input.weekdayTaskTarget ?? defaultSettings.weekdayTaskTarget,
    ),
    weekendTaskTarget: Number(
      input.weekendTaskTarget ?? defaultSettings.weekendTaskTarget,
    ),
    weeklyTheme: input.weeklyTheme ?? defaultSettings.weeklyTheme,
    timerFocusMinutes: Number(
      input.timerFocusMinutes ?? defaultSettings.timerFocusMinutes,
    ),
    timerBreakMinutes: Number(
      input.timerBreakMinutes ?? defaultSettings.timerBreakMinutes,
    ),
    onboardingCompleted: Boolean(input.onboardingCompleted),
  };

  return {
    ...normalized,
    onboardingCompleted: hasCompletedOnboarding(normalized),
  };
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
      snapshot.aiFocusTheme &&
      snapshot.aiMorningPlan &&
      snapshot.aiNightPlan &&
      snapshot.aiApplyPlan &&
      snapshot.aiOneCut &&
      snapshot.aiWeekendMission
        ? {
            summary: snapshot.aiSummary,
            biggestRisk: snapshot.aiBiggestRisk,
            focusTheme: snapshot.aiFocusTheme,
            morningPlan: snapshot.aiMorningPlan,
            nightPlan: snapshot.aiNightPlan,
            applyPlan: snapshot.aiApplyPlan,
            oneCut: snapshot.aiOneCut,
            weekendMission: snapshot.aiWeekendMission,
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

function calculateTargetProgress(value: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
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

function calculateActiveStreaks(userId: string, snapshots: SnapshotRow[]) {
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < snapshots.length; i += 1) {
    const item = snapshots[i];
    if (!item) continue;

    const hasActivity =
      calculateCompletedCount(item) > 0 ||
      getCount("dsa_entries", userId, item.dateKey) > 0 ||
      getCount("build_entries", userId, item.dateKey) > 0 ||
      getCount("application_entries", userId, item.dateKey) > 0;

    if (hasActivity) {
      tempStreak += 1;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  for (let i = snapshots.length - 1; i >= 0; i -= 1) {
    const item = snapshots[i];
    if (!item) break;

    const hasActivity =
      calculateCompletedCount(item) > 0 ||
      getCount("dsa_entries", userId, item.dateKey) > 0 ||
      getCount("build_entries", userId, item.dateKey) > 0 ||
      getCount("application_entries", userId, item.dateKey) > 0;

    if (hasActivity) {
      currentStreak += 1;
    } else if (item.dateKey !== toDateKey()) {
      break;
    }
  }

  return { currentStreak, maxStreak };
}

function hasTable(table: string) {
  const row = db
    .prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { name?: string } | undefined;

  return Boolean(row?.name);
}

function hasCompletedOnboarding(settings: Partial<DashboardData["settings"]>) {
  return Boolean(
    settings.primaryGoal &&
      settings.targetRole &&
      settings.linkedinUrl &&
      settings.jobTrackerUrl &&
      settings.university &&
      settings.planStyle,
  );
}
