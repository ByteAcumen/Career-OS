import "server-only";

import { getDashboardData } from "@/lib/dashboard";
import { getScheduleForDate } from "@/lib/schedule";
import type { DashboardData, ScheduleBlock, WorkspaceSettings } from "@/lib/types";

export type WorkspaceActivityItem = {
  id: string;
  kind: "DSA" | "Build" | "Application";
  title: string;
  detail: string;
  meta: string;
  createdAt: string;
  href?: string;
};

export type HomePageData = {
  settings: WorkspaceSettings;
  metrics: DashboardData["metrics"];
  planner: DashboardData["planner"];
  today: DashboardData["today"];
  history: DashboardData["history"];
  recentActivity: WorkspaceActivityItem[];
  scheduleBlocks: ScheduleBlock[];
};

export type PlannerPageData = {
  settings: WorkspaceSettings;
  integrations: DashboardData["integrations"];
  planner: DashboardData["planner"];
  today: DashboardData["today"];
  metrics: DashboardData["metrics"];
  scheduleBlocks: ScheduleBlock[];
};

export type LoggerPageData = {
  settings: WorkspaceSettings;
  integrations: DashboardData["integrations"];
  today: DashboardData["today"];
  metrics: DashboardData["metrics"];
  recentDsa: DashboardData["recentDsa"];
  recentBuilds: DashboardData["recentBuilds"];
  recentApplications: DashboardData["recentApplications"];
};

export type ProgressPageData = {
  metrics: DashboardData["metrics"];
  history: DashboardData["history"];
  githubActivity: DashboardData["githubActivity"];
  recentDsa: DashboardData["recentDsa"];
  recentBuilds: DashboardData["recentBuilds"];
  recentApplications: DashboardData["recentApplications"];
};

export type StrategyPageData = {
  settings: WorkspaceSettings;
  integrations: DashboardData["integrations"];
  metrics: DashboardData["metrics"];
  today: DashboardData["today"];
  plannerSummary: DashboardData["planner"]["summary"];
  recentDsa: DashboardData["recentDsa"];
  recentBuilds: DashboardData["recentBuilds"];
  recentApplications: DashboardData["recentApplications"];
  history: DashboardData["history"];
};

export type SettingsPageData = {
  settings: WorkspaceSettings;
  integrations: DashboardData["integrations"];
  metrics: DashboardData["metrics"];
  plannerSummary: DashboardData["planner"]["summary"];
};

export async function getHomePageData(userId: string): Promise<HomePageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: false,
    includeIntegrations: false,
    includePlannerTasks: true,
    includeRecentEntries: true,
    includePreviousDay: false,
  });

  return {
    settings: dashboard.settings,
    metrics: dashboard.metrics,
    planner: dashboard.planner,
    today: dashboard.today,
    history: dashboard.history,
    recentActivity: buildRecentActivity(dashboard),
    scheduleBlocks: getScheduleForDate(dashboard.today.dateKey, dashboard.settings),
  };
}

export async function getPlannerPageData(userId: string): Promise<PlannerPageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: false,
    includeIntegrations: true,
    includePlannerTasks: true,
    includeRecentEntries: false,
    includePreviousDay: false,
  });

  return {
    settings: dashboard.settings,
    integrations: dashboard.integrations,
    planner: dashboard.planner,
    today: dashboard.today,
    metrics: dashboard.metrics,
    scheduleBlocks: getScheduleForDate(dashboard.today.dateKey, dashboard.settings),
  };
}

export async function getLoggerPageData(userId: string): Promise<LoggerPageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: false,
    includeIntegrations: false,
    includePlannerTasks: false,
    includeRecentEntries: true,
    includePreviousDay: false,
  });

  return {
    settings: dashboard.settings,
    integrations: dashboard.integrations,
    today: dashboard.today,
    metrics: dashboard.metrics,
    recentDsa: dashboard.recentDsa,
    recentBuilds: dashboard.recentBuilds,
    recentApplications: dashboard.recentApplications,
  };
}

export async function getProgressPageData(userId: string): Promise<ProgressPageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: true,
    includeIntegrations: false,
    includePlannerTasks: false,
    includeRecentEntries: true,
    includePreviousDay: false,
  });

  return {
    metrics: dashboard.metrics,
    history: dashboard.history,
    githubActivity: dashboard.githubActivity,
    recentDsa: dashboard.recentDsa,
    recentBuilds: dashboard.recentBuilds,
    recentApplications: dashboard.recentApplications,
  };
}

export async function getStrategyPageData(userId: string): Promise<StrategyPageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: false,
    includeIntegrations: true,
    includePlannerTasks: true,
    includeRecentEntries: true,
    includePreviousDay: false,
  });

  return {
    settings: dashboard.settings,
    integrations: dashboard.integrations,
    metrics: dashboard.metrics,
    today: dashboard.today,
    plannerSummary: dashboard.planner.summary,
    recentDsa: dashboard.recentDsa,
    recentBuilds: dashboard.recentBuilds,
    recentApplications: dashboard.recentApplications,
    history: dashboard.history,
  };
}

export async function getSettingsPageData(userId: string): Promise<SettingsPageData> {
  const dashboard = await getDashboardData(userId, undefined, {
    includeGithubActivity: false,
    includeIntegrations: true,
    includePlannerTasks: true,
    includeRecentEntries: false,
    includePreviousDay: false,
  });

  return {
    settings: dashboard.settings,
    integrations: dashboard.integrations,
    metrics: dashboard.metrics,
    plannerSummary: dashboard.planner.summary,
  };
}

function buildRecentActivity(dashboard: DashboardData): WorkspaceActivityItem[] {
  return [
    ...dashboard.recentApplications.slice(0, 4).map((item) => ({
      id: `application-${item.id}`,
      kind: "Application" as const,
      title: `${item.role} at ${item.company}`,
      detail: item.note || item.status,
      meta: item.status,
      createdAt: item.createdAt,
      href: item.roleUrl ?? undefined,
    })),
    ...dashboard.recentBuilds.slice(0, 4).map((item) => ({
      id: `build-${item.id}`,
      kind: "Build" as const,
      title: item.title,
      detail: item.impact || item.proof || item.area,
      meta: item.area,
      createdAt: item.createdAt,
      href: item.repositoryUrl ?? undefined,
    })),
    ...dashboard.recentDsa.slice(0, 4).map((item) => ({
      id: `dsa-${item.id}`,
      kind: "DSA" as const,
      title: item.title,
      detail: item.insight || `${item.difficulty} · ${item.pattern}`,
      meta: `${item.difficulty} · ${item.pattern}`,
      createdAt: item.createdAt,
      href: item.repositoryUrl ?? undefined,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8);
}
