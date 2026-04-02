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

export type AiProviderSource = "user" | "server" | "none";

export type PlannerTaskScope = "daily" | "weekly" | "weekend";

export type PlannerTaskStatus = "todo" | "in_progress" | "done";

export type PlannerTaskPriority = "high" | "medium" | "low";

export type PlannerTaskCategory =
  | "revision"
  | "dsa"
  | "build"
  | "application"
  | "interview"
  | "custom";

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
    linkedinUrl: string;
    portfolioUrl: string;
    codeforcesUrl: string;
    codechefUrl: string;
    hackerrankUrl: string;
    jobTrackerUrl: string;
    primaryGoal: string;
    targetRole: string;
    targetCompanies: string;
    university: string;
    degree: string;
    graduationYear: string;
    planStyle: string;
    customAiInstructions: string;
    aiProvider: AiProvider;
    googleAppsScriptUrl: string;
    openAiModel: string;
    weekendDsaMinutes: number;
    weekendBuildMinutes: number;
    weeklyDsaTarget: number;
    weeklyApplicationTarget: number;
    weeklyBuildTarget: number;
    weekdayDeepWorkMinutes: number;
    weekdaySupportMinutes: number;
    weekdayTaskTarget: number;
    weekendTaskTarget: number;
    weeklyTheme: string;
    timerFocusMinutes: number;
    timerBreakMinutes: number;
    onboardingCompleted: boolean;
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
    providerSources: {
      openai: AiProviderSource;
      gemini: AiProviderSource;
      openrouter: AiProviderSource;
    };
    savedApiKeys: {
      openai: boolean;
      gemini: boolean;
      openrouter: boolean;
    };
  };
  planner: {
    tasks: Array<{
      id: string;
      title: string;
      details: string;
      scope: PlannerTaskScope;
      category: PlannerTaskCategory;
      priority: PlannerTaskPriority;
      status: PlannerTaskStatus;
      estimateMinutes: number;
      targetDateKey: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    summary: {
      total: number;
      completed: number;
      active: number;
      todayOpen: number;
      daily: {
        total: number;
        completed: number;
      };
      weekly: {
        total: number;
        completed: number;
      };
      weekend: {
        total: number;
        completed: number;
      };
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

export type StudentStrategy = {
  headline: string;
  todayMission: string;
  dsaPriority: string;
  buildPriority: string;
  applicationPriority: string;
  mockInterviewTask: string;
  realityCheck: string;
};

export type PlannerSuggestion = {
  title: string;
  details: string;
  scope: PlannerTaskScope;
  category: PlannerTaskCategory;
  priority: PlannerTaskPriority;
  estimateMinutes: number;
};

export type PlannerSuggestionPack = {
  headline: string;
  daily: PlannerSuggestion[];
  weekly: PlannerSuggestion[];
  weekend: PlannerSuggestion[];
};
