import { randomUUID } from "node:crypto";
import { startOfWeek, subDays } from "date-fns";
import { getAiProviderStatus } from "@/lib/ai-credentials";
import { client } from "@/lib/db";
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

type DailyDetailDsaRow = DashboardData["recentDsa"][number];
type DailyDetailBuildRow = DashboardData["recentBuilds"][number];
type DailyDetailApplicationRow = DashboardData["recentApplications"][number];

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

async function hasTable(tableName: string) {
  const rs = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    args: [tableName],
  });
  return rs.rows.length > 0;
}

export async function claimLegacyDataForUser(userId: string) {
  // Check if we are the first user (only user) to avoid claiming for others if multi-user
  const userCountRs = await client.execute("SELECT COUNT(*) as count FROM user");
  const userCount = Number(userCountRs.rows[0]?.count ?? 0);

  if (userCount > 1) {
    await ensureSettings(userId);
    return;
  }

  const hasUserDataRs = await client.execute({
    sql: "SELECT EXISTS(SELECT 1 FROM daily_snapshots WHERE userId = ?) as hasData",
    args: [userId],
  });
  if (Number(hasUserDataRs.rows[0]?.hasData ?? 0)) {
    await ensureSettings(userId);
    return;
  }

  const legacySettingsTable = await hasTable("legacy_app_settings");
  const legacySnapshotsTable = await hasTable("legacy_daily_snapshots");
  const legacyDsaTable = await hasTable("legacy_dsa_entries");
  const legacyBuildTable = await hasTable("legacy_build_entries");

  if (legacySettingsTable) {
    const rs = await client.execute({
      sql: `SELECT sheetUrl, resumeUrl, githubUrl, leetcodeUrl, primaryGoal, aiProvider,
                  googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes,
                  weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget,
                  timerFocusMinutes, timerBreakMinutes
           FROM legacy_app_settings
           LIMIT 1`,
    });
    const legacySettings = rs.rows[0] as unknown as DashboardData["settings"] | undefined;
    if (legacySettings) {
      await saveSettings(userId, normalizeSettings(legacySettings));
    }
  }

  if (legacySnapshotsTable) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO daily_snapshots
          (userId, dateKey, morningRevision, microRevision, deepWork, supportBlock, shutdownReview,
           note, tomorrowTask, aiSummary, aiBiggestRisk, aiFocusTheme, aiMorningPlan, aiNightPlan,
           aiApplyPlan, aiOneCut, aiWeekendMission, createdAt, updatedAt)
         SELECT ?, dateKey, morningRevision, microRevision, deepWork, supportBlock, shutdownReview,
                note, tomorrowTask, aiSummary, aiBiggestRisk, aiFocusTheme, aiMorningPlan, aiNightPlan,
                aiApplyPlan, aiOneCut, aiWeekendMission, createdAt, updatedAt
         FROM legacy_daily_snapshots`,
      args: [userId],
    });
  }

  if (legacyDsaTable) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO dsa_entries
          (id, userId, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl, createdAt)
         SELECT id, ?, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl, createdAt
         FROM legacy_dsa_entries`,
      args: [userId],
    });
  }

  if (legacyBuildTable) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO build_entries
          (id, userId, snapshotDateKey, title, area, proof, impact, repositoryUrl, createdAt)
         SELECT id, ?, snapshotDateKey, title, area, proof, impact, repositoryUrl, createdAt
         FROM legacy_build_entries`,
      args: [userId],
    });
  }

  await ensureSettings(userId);
}


export async function ensureSettings(userId: string) {
  const existingRs = await client.execute({
    sql: `SELECT sheetUrl, resumeUrl, githubUrl, leetcodeUrl, linkedinUrl, portfolioUrl, codeforcesUrl,
                codechefUrl, hackerrankUrl, jobTrackerUrl, primaryGoal, targetRole, targetCompanies,
                university, degree, graduationYear, planStyle, customAiInstructions, aiProvider,
                googleAppsScriptUrl, openAiModel, weekendDsaMinutes, weekendBuildMinutes,
                weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget, weekdayDeepWorkMinutes,
                weekdaySupportMinutes, weekdayTaskTarget, weekendTaskTarget, weeklyTheme,
                timerFocusMinutes, timerBreakMinutes
         FROM app_settings
         WHERE userId = ?`,
    args: [userId],
  });
  
  const existing = existingRs.rows[0] as unknown as DashboardData["settings"] | undefined;

  if (existing) {
    return normalizeSettings(existing);
  }

  await client.execute({
    sql: `INSERT INTO app_settings
      (userId, sheetUrl, resumeUrl, githubUrl, leetcodeUrl, linkedinUrl, portfolioUrl, codeforcesUrl,
       codechefUrl, hackerrankUrl, jobTrackerUrl, primaryGoal, targetRole, targetCompanies, university, degree,
       graduationYear, planStyle, customAiInstructions, aiProvider, googleAppsScriptUrl, openAiModel,
       weekendDsaMinutes, weekendBuildMinutes, weeklyDsaTarget, weeklyApplicationTarget, weeklyBuildTarget,
       weekdayDeepWorkMinutes, weekdaySupportMinutes, weekdayTaskTarget, weekendTaskTarget, weeklyTheme,
       timerFocusMinutes, timerBreakMinutes)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?,
       ?, ?)`,
    args: [
      userId,
      defaultSettings.sheetUrl,
      defaultSettings.resumeUrl,
      defaultSettings.githubUrl,
      defaultSettings.leetcodeUrl,
      defaultSettings.linkedinUrl,
      defaultSettings.portfolioUrl,
      defaultSettings.codeforcesUrl,
      defaultSettings.codechefUrl,
      defaultSettings.hackerrankUrl,
      defaultSettings.jobTrackerUrl,
      defaultSettings.primaryGoal,
      defaultSettings.targetRole,
      defaultSettings.targetCompanies,
      defaultSettings.university,
      defaultSettings.degree,
      defaultSettings.graduationYear,
      defaultSettings.planStyle,
      defaultSettings.customAiInstructions,
      defaultSettings.aiProvider,
      defaultSettings.googleAppsScriptUrl,
      defaultSettings.openAiModel,
      defaultSettings.weekendDsaMinutes,
      defaultSettings.weekendBuildMinutes,
      defaultSettings.weeklyDsaTarget,
      defaultSettings.weeklyApplicationTarget,
      defaultSettings.weeklyBuildTarget,
      defaultSettings.weekdayDeepWorkMinutes,
      defaultSettings.weekdaySupportMinutes,
      defaultSettings.weekdayTaskTarget,
      defaultSettings.weekendTaskTarget,
      defaultSettings.weeklyTheme,
      defaultSettings.timerFocusMinutes,
      defaultSettings.timerBreakMinutes,
    ],
  });

  return defaultSettings;
}

export async function saveSettings(
  userId: string,
  settings: Partial<DashboardData["settings"]>,
) {
  await ensureSettings(userId);
  const normalized = normalizeSettings(settings);
  await client.execute({
    sql: `UPDATE app_settings
      SET sheetUrl = ?,
          resumeUrl = ?,
          githubUrl = ?,
          leetcodeUrl = ?,
          linkedinUrl = ?,
          portfolioUrl = ?,
          codeforcesUrl = ?,
          codechefUrl = ?,
          hackerrankUrl = ?,
          jobTrackerUrl = ?,
          primaryGoal = ?,
          targetRole = ?,
          targetCompanies = ?,
          university = ?,
          degree = ?,
          graduationYear = ?,
          planStyle = ?,
          customAiInstructions = ?,
          aiProvider = ?,
          googleAppsScriptUrl = ?,
          openAiModel = ?,
          weekendDsaMinutes = ?,
          weekendBuildMinutes = ?,
          weeklyDsaTarget = ?,
          weeklyApplicationTarget = ?,
          weeklyBuildTarget = ?,
          weekdayDeepWorkMinutes = ?,
          weekdaySupportMinutes = ?,
          weekdayTaskTarget = ?,
          weekendTaskTarget = ?,
          weeklyTheme = ?,
          timerFocusMinutes = ?,
          timerBreakMinutes = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ?`,
    args: [
      normalized.sheetUrl,
      normalized.resumeUrl,
      normalized.githubUrl,
      normalized.leetcodeUrl,
      normalized.linkedinUrl,
      normalized.portfolioUrl,
      normalized.codeforcesUrl,
      normalized.codechefUrl,
      normalized.hackerrankUrl,
      normalized.jobTrackerUrl,
      normalized.primaryGoal,
      normalized.targetRole,
      normalized.targetCompanies,
      normalized.university,
      normalized.degree,
      normalized.graduationYear,
      normalized.planStyle,
      normalized.customAiInstructions,
      normalized.aiProvider,
      normalized.googleAppsScriptUrl,
      normalized.openAiModel,
      normalized.weekendDsaMinutes,
      normalized.weekendBuildMinutes,
      normalized.weeklyDsaTarget,
      normalized.weeklyApplicationTarget,
      normalized.weeklyBuildTarget,
      normalized.weekdayDeepWorkMinutes,
      normalized.weekdaySupportMinutes,
      normalized.weekdayTaskTarget,
      normalized.weekendTaskTarget,
      normalized.weeklyTheme,
      normalized.timerFocusMinutes,
      normalized.timerBreakMinutes,
      userId,
    ],
  });

  return normalized;
}

export async function ensureSnapshot(userId: string, dateKey = toDateKey()) {
  await client.execute({
    sql: `INSERT INTO daily_snapshots (userId, dateKey)
     VALUES (?, ?)
     ON CONFLICT(userId, dateKey) DO NOTHING`,
    args: [userId, dateKey],
  });

  return getSnapshotOrThrow(userId, dateKey);
}

export async function updateCheckin(userId: string, dateKey: string, key: string, value: boolean) {
  await ensureSnapshot(userId, dateKey);
  await client.execute({
    sql: `UPDATE daily_snapshots
      SET ${key} = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
    args: [value ? 1 : 0, userId, dateKey],
  });

  return getSnapshot(userId, dateKey);
}

export async function saveReview(
  userId: string,
  dateKey: string,
  note: string,
  tomorrowTask: string,
) {
  await ensureSnapshot(userId, dateKey);
  await client.execute({
    sql: `UPDATE daily_snapshots
      SET note = ?, tomorrowTask = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
    args: [note || null, tomorrowTask || null, userId, dateKey],
  });

  return getSnapshot(userId, dateKey);
}

export async function createDsaEntry(
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
  await ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  await client.execute({
    sql: `INSERT INTO dsa_entries
      (id, userId, snapshotDateKey, title, difficulty, pattern, insight, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      input.dateKey,
      input.title,
      input.difficulty,
      input.pattern,
      input.insight || null,
      input.repositoryUrl || null,
    ],
  });

  return { id, ...input };
}

export async function createBuildEntry(
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
  await ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  await client.execute({
    sql: `INSERT INTO build_entries
      (id, userId, snapshotDateKey, title, area, proof, impact, repositoryUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      input.dateKey,
      input.title,
      input.area,
      input.proof || null,
      input.impact || null,
      input.repositoryUrl || null,
    ],
  });

  return { id, ...input };
}

export async function createApplicationEntry(
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
  await ensureSnapshot(userId, input.dateKey);
  const id = randomUUID();

  await client.execute({
    sql: `INSERT INTO application_entries
      (id, userId, snapshotDateKey, company, role, status, note, roleUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      userId,
      input.dateKey,
      input.company,
      input.role,
      input.status,
      input.note || null,
      input.roleUrl || null,
    ],
  });

  return { id, ...input };
}

export async function createPlannerTask(
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

  await client.execute({
    sql: `INSERT INTO planner_tasks
      (id, userId, title, details, scope, category, priority, status, estimateMinutes, targetDateKey)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
    args: [
      id,
      userId,
      input.title,
      input.details || null,
      input.scope,
      input.category,
      input.priority,
      input.estimateMinutes,
      input.targetDateKey || null,
    ],
  });

  return getPlannerTaskOrThrow(userId, id);
}

export async function updatePlannerTaskStatus(
  userId: string,
  id: string,
  status: DashboardData["planner"]["tasks"][number]["status"],
) {
  await client.execute({
    sql: `UPDATE planner_tasks
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND id = ?`,
    args: [status, userId, id],
  });

  return getPlannerTaskOrThrow(userId, id);
}

export async function deletePlannerTask(userId: string, id: string) {
  await client.execute({
    sql: `DELETE FROM planner_tasks
     WHERE userId = ? AND id = ?`,
    args: [userId, id],
  });

  return { ok: true };
}

export async function getPendingApplicationsForSync(userId: string) {
  const rs = await client.execute({
    sql: `SELECT id, snapshotDateKey, company, role, status, note, roleUrl, createdAt
       FROM application_entries
       WHERE userId = ? AND syncedToSheet = 0
       ORDER BY createdAt ASC`,
    args: [userId],
  });
  return rs.rows as unknown as Array<{
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

export async function markApplicationSynced(userId: string, id: string) {
  await client.execute({
    sql: `UPDATE application_entries
      SET syncedToSheet = 1, syncedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND id = ?`,
    args: [userId, id],
  });
}

export async function saveCoachResponse(
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
  await ensureSnapshot(userId, dateKey);
  await client.execute({
    sql: `UPDATE daily_snapshots
      SET aiSummary = ?, aiBiggestRisk = ?, aiFocusTheme = ?, aiMorningPlan = ?, aiNightPlan = ?, aiApplyPlan = ?, aiOneCut = ?, aiWeekendMission = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE userId = ? AND dateKey = ?`,
    args: [
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
    ],
  });
}

export async function getDashboardData(
  userId: string,
  targetDateKey?: string,
): Promise<DashboardData> {
  const settings = await ensureSettings(userId);
  const todayKey = targetDateKey ?? toDateKey();
  const today = await ensureSnapshot(userId, todayKey);
  const previous = await getSnapshot(
    userId,
    previousDateKey(1, new Date(`${todayKey}T12:00:00`)),
  );
  
  const historyRs = await client.execute({
    sql: `SELECT * FROM daily_snapshots WHERE userId = ? AND dateKey >= ? ORDER BY dateKey ASC`,
    args: [userId, toDateKey(subDays(new Date(), 89))],
  });
  const history = historyRs.rows as unknown as SnapshotRow[];

  const recentDsaRs = await client.execute({
    sql: `SELECT id, title, difficulty, pattern, insight, repositoryUrl, createdAt
       FROM dsa_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 6`,
    args: [userId],
  });
  const recentDsa = recentDsaRs.rows as unknown as DashboardData["recentDsa"];

  const recentBuildsRs = await client.execute({
    sql: `SELECT id, title, area, proof, impact, repositoryUrl, createdAt
       FROM build_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 6`,
    args: [userId],
  });
  const recentBuilds = recentBuildsRs.rows as unknown as DashboardData["recentBuilds"];

  const rawApplicationsRs = await client.execute({
    sql: `SELECT id, company, role, status, note, roleUrl, syncedToSheet, createdAt
       FROM application_entries
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 8`,
    args: [userId],
  });
  const rawApplications = rawApplicationsRs.rows as unknown as Array<
    Omit<DashboardData["recentApplications"][number], "syncedToSheet"> & {
      syncedToSheet: number;
    }
  >;

  const recentApplications = rawApplications.map((item) => ({
    ...item,
    syncedToSheet: Boolean(item.syncedToSheet),
  }));

  const plannerTasksRs = await client.execute({
    sql: `SELECT id, title, details, scope, category, priority, status, estimateMinutes, targetDateKey, createdAt, updatedAt
       FROM planner_tasks
       WHERE userId = ?
       ORDER BY
        CASE scope WHEN 'daily' THEN 0 WHEN 'weekly' THEN 1 ELSE 2 END,
        CASE status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        COALESCE(targetDateKey, '9999-12-31') ASC,
        updatedAt DESC
       LIMIT 36`,
    args: [userId],
  });
  const plannerTasks = plannerTasksRs.rows as unknown as DashboardData["planner"]["tasks"];

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekSnapshots = history.filter(
    (item) => new Date(`${item.dateKey}T00:00:00`) >= weekStart,
  );

  let totalXP = 0;
  for (const item of history) {
    const dsaCount = await getCount("dsa_entries", userId, item.dateKey);
    const buildCount = await getCount("build_entries", userId, item.dateKey);
    const appCount = await getCount("application_entries", userId, item.dateKey);
    const checks = calculateCompletedCount(item);
    totalXP += dsaCount * 15 + buildCount * 25 + appCount * 10 + checks * 5;
  }

  const currentLevel = Math.floor(totalXP / 250) + 1;
  const xpForCurrentLevel = (currentLevel - 1) * 250;
  const xpForNextLevel = currentLevel * 250;
  const levelProgress = Math.round(
    ((totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100,
  );

  const { currentStreak, maxStreak } = await calculateActiveStreaks(userId, history);

  const weekDsaPromises = currentWeekSnapshots.map(item => getCount("dsa_entries", userId, item.dateKey));
  const weekApplicationsPromises = currentWeekSnapshots.map(item => getCount("application_entries", userId, item.dateKey));
  const weekBuildsPromises = currentWeekSnapshots.map(item => getCount("build_entries", userId, item.dateKey));

  const weekDsas = await Promise.all(weekDsaPromises);
  const weekApplicationsList = await Promise.all(weekApplicationsPromises);
  const weekBuildsList = await Promise.all(weekBuildsPromises);

  const weekDsa = weekDsas.reduce((a, b) => a + b, 0);
  const weekApplications = weekApplicationsList.reduce((a, b) => a + b, 0);
  const weekBuilds = weekBuildsList.reduce((a, b) => a + b, 0);

  const githubActivity = await fetchGithubActivity(settings.githubUrl);
  const providerStatus = await getAiProviderStatus(userId);
  const plannerSummary = summarizePlannerTasks(plannerTasks, todayKey);

  // We need to fetch counts for each history item to display in the UI map
  const historyWithCounts = await Promise.all(history.map(async (item) => ({
    dateKey: item.dateKey,
    completedCount: calculateCompletedCount(item),
    dsaCount: await getCount("dsa_entries", userId, item.dateKey),
    buildCount: await getCount("build_entries", userId, item.dateKey),
    appCount: await getCount("application_entries", userId, item.dateKey),
  })));

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
      syncedApplications: await getBooleanCount(userId, true),
      pendingApplications: await getBooleanCount(userId, false),
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
          dsaCount: await getCount("dsa_entries", userId, previous.dateKey),
          buildCount: await getCount("build_entries", userId, previous.dateKey),
          appCount: await getCount("application_entries", userId, previous.dateKey),
          note: previous.note ?? "",
        }
      : null,
    recentDsa,
    recentBuilds,
    recentApplications,
    githubActivity,
    history: historyWithCounts,
  };
}

export async function getDailyDetail(userId: string, dateKey: string) {
  const snapshot = await getSnapshot(userId, dateKey);
  if (!snapshot) return null;

  const dsaRs = await client.execute({
    sql: `SELECT id, title, difficulty, pattern, insight, repositoryUrl, createdAt
         FROM dsa_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
    args: [userId, dateKey],
  });
  
  const buildRs = await client.execute({
    sql: `SELECT id, title, area, proof, impact, repositoryUrl, createdAt
         FROM build_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
    args: [userId, dateKey],
  });
  
  const appRs = await client.execute({
    sql: `SELECT id, company, role, status, note, roleUrl, syncedToSheet, createdAt
         FROM application_entries
         WHERE userId = ? AND snapshotDateKey = ?
         ORDER BY createdAt DESC`,
    args: [userId, dateKey],
  });

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
    dsa: dsaRs.rows as unknown as DailyDetailDsaRow[],
    builds: buildRs.rows as unknown as DailyDetailBuildRow[],
    applications: appRs.rows as unknown as DailyDetailApplicationRow[],
  };
}

async function getSnapshot(userId: string, dateKey: string) {
  const rs = await client.execute({
    sql: `SELECT * FROM daily_snapshots WHERE userId = ? AND dateKey = ?`,
    args: [userId, dateKey],
  });
  return rs.rows[0] as unknown as SnapshotRow | undefined;
}

async function getSnapshotOrThrow(userId: string, dateKey: string) {
  const snapshot = await getSnapshot(userId, dateKey);
  if (!snapshot) {
    throw new Error(`Snapshot not found for ${dateKey}`);
  }
  return snapshot;
}

async function getCount(
  table: "dsa_entries" | "build_entries" | "application_entries",
  userId: string,
  dateKey: string,
) {
  const rs = await client.execute({
    sql: `SELECT COUNT(*) as count FROM ${table} WHERE userId = ? AND snapshotDateKey = ?`,
    args: [userId, dateKey],
  });
  return Number(rs.rows[0]?.count ?? 0);
}

async function getBooleanCount(userId: string, value: boolean) {
  const rs = await client.execute({
    sql: `SELECT COUNT(*) as count FROM application_entries WHERE userId = ? AND syncedToSheet = ?`,
    args: [userId, value ? 1 : 0],
  });
  return Number(rs.rows[0]?.count ?? 0);
}

async function getPlannerTaskOrThrow(userId: string, id: string) {
  const rs = await client.execute({
    sql: `SELECT id, title, details, scope, category, priority, status, estimateMinutes, targetDateKey, createdAt, updatedAt
       FROM planner_tasks
       WHERE userId = ? AND id = ?`,
    args: [userId, id],
  });
  const task = rs.rows[0] as unknown as DashboardData["planner"]["tasks"][number] | undefined;

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

async function calculateActiveStreaks(userId: string, snapshots: SnapshotRow[]) {
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  for (let i = 0; i < snapshots.length; i += 1) {
    const item = snapshots[i];
    if (!item) continue;

    const hasActivity =
      calculateCompletedCount(item) > 0 ||
      (await getCount("dsa_entries", userId, item.dateKey)) > 0 ||
      (await getCount("build_entries", userId, item.dateKey)) > 0 ||
      (await getCount("application_entries", userId, item.dateKey)) > 0;

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
      (await getCount("dsa_entries", userId, item.dateKey)) > 0 ||
      (await getCount("build_entries", userId, item.dateKey)) > 0 ||
      (await getCount("application_entries", userId, item.dateKey)) > 0;

    if (hasActivity) {
      currentStreak += 1;
    } else if (item.dateKey !== toDateKey()) {
      break;
    }
  }

  return { currentStreak, maxStreak };
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
