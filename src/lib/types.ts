export type CheckinKey =
  | "morningRevision"
  | "microRevision"
  | "deepWork"
  | "supportBlock"
  | "shutdownReview";

export type GithubActivity = {
  id: string;
  type: string;
  repoName: string;
  createdAt: string;
};

export type AiProvider = "openai" | "gemini" | "openrouter";

export type ScheduleBlock = {
  key: string;
  label: string;
  description: string;
  timeLabel: string;
  startIso: string;
  endIso: string;
};

export type DashboardData = {
  settings: {
    sheetUrl: string;
    resumeUrl: string;
    githubUrl: string;
    leetcodeUrl: string;
    primaryGoal: string;
    aiProvider: AiProvider;
    googleAppsScriptUrl: string;
    openAiModel: string;
    weekendDsaMinutes: number;
    weekendBuildMinutes: number;
    weeklyDsaTarget: number;
    weeklyApplicationTarget: number;
    weeklyBuildTarget: number;
    timerFocusMinutes: number;
    timerBreakMinutes: number;
  };
  metrics: {
    revisionStreak: number;
    currentStreak: number;
    maxStreak: number;
    level: number;
    levelProgress: number;
    totalXP: number;
    weekDsa: number;
    weekApplications: number;
    weekBuilds: number;
    todayScore: number;
    syncedApplications: number;
    pendingApplications: number;
    targetProgress: {
      dsa: number;
      applications: number;
      builds: number;
    };
  };
  integrations: {
    aiReady: boolean;
    googleSheetsReady: boolean;
    providers: {
      openai: boolean;
      gemini: boolean;
      openrouter: boolean;
    };
  };
  today: {
    dateKey: string;
    checkins: Record<CheckinKey, boolean>;
    note: string;
    tomorrowTask: string;
    ai?: {
      summary: string;
      biggestRisk: string;
      focusTheme: string;
      morningPlan: string;
      nightPlan: string;
      applyPlan: string;
      oneCut: string;
      weekendMission: string;
    } | null;
  };
  previousDay: {
    dateKey: string;
    dsaCount: number;
    buildCount: number;
    appCount: number;
    note: string;
  } | null;
  recentDsa: Array<{
    id: string;
    title: string;
    difficulty: string;
    pattern: string;
    insight: string | null;
    repositoryUrl: string | null;
    createdAt: string;
  }>;
  recentBuilds: Array<{
    id: string;
    title: string;
    area: string;
    proof: string | null;
    impact: string | null;
    repositoryUrl: string | null;
    createdAt: string;
  }>;
  recentApplications: Array<{
    id: string;
    company: string;
    role: string;
    status: string;
    note: string | null;
    roleUrl: string | null;
    syncedToSheet: boolean;
    createdAt: string;
  }>;
  githubActivity: GithubActivity[];
  history: Array<{
    dateKey: string;
    completedCount: number;
    dsaCount: number;
    buildCount: number;
    appCount: number;
  }>;
};
