import "server-only";

import { randomUUID } from "node:crypto";

import { stableJsonStringify } from "@/lib/ai-cache";
import { client } from "@/lib/db";
import type {
  AssistantContextPage,
  AssistantConversation,
  AssistantConversationMessage,
  AssistantConversationSummary,
  DashboardData,
} from "@/lib/types";

const DEFAULT_CONVERSATION_TITLE = "New chat";
const CONVERSATION_LIMIT = 24;

export function normalizeAssistantPage(value?: string | null): AssistantContextPage {
  switch (value) {
    case "planner":
    case "logger":
    case "progress":
    case "strategy":
    case "settings":
      return value;
    case "home":
    default:
      return "home";
  }
}

export async function listAssistantConversations(
  userId: string,
): Promise<AssistantConversationSummary[]> {
  const result = await client.execute({
    sql: `SELECT c.id,
                 c.title,
                 c.lastPreview,
                 c.pageContext,
                 c.createdAt,
                 c.updatedAt,
                 (
                   SELECT COUNT(*)
                   FROM assistant_messages m
                   WHERE m.userId = c.userId AND m.conversationId = c.id
                 ) AS messageCount
          FROM assistant_conversations c
          WHERE c.userId = ?
          ORDER BY c.updatedAt DESC
          LIMIT ?`,
    args: [userId, CONVERSATION_LIMIT],
  });

  return result.rows.map((row) => mapConversationSummary(row));
}

export async function getAssistantConversation(
  userId: string,
  conversationId: string,
): Promise<AssistantConversation | null> {
  const summary = await getAssistantConversationSummary(userId, conversationId);
  if (!summary) {
    return null;
  }

  const messageResult = await client.execute({
    sql: `SELECT id, role, content, createdAt
          FROM assistant_messages
          WHERE userId = ? AND conversationId = ?
          ORDER BY createdAt ASC, id ASC`,
    args: [userId, conversationId],
  });

  return {
    ...summary,
    messages: messageResult.rows.map((row) => mapConversationMessage(row)),
  };
}

export async function ensureAssistantConversation(
  userId: string,
  conversationId: string | null | undefined,
  pageContext: AssistantContextPage,
) {
  if (conversationId) {
    const existing = await getAssistantConversationSummary(userId, conversationId);
    if (existing) {
      if (existing.pageContext !== pageContext) {
        await client.execute({
          sql: `UPDATE assistant_conversations
                SET pageContext = ?, updatedAt = CURRENT_TIMESTAMP
                WHERE id = ? AND userId = ?`,
          args: [pageContext, conversationId, userId],
        });
      }

      return existing;
    }
  }

  const id = randomUUID();
  const nowPreview = "Start a new workspace conversation.";

  await client.execute({
    sql: `INSERT INTO assistant_conversations
          (id, userId, title, lastPreview, pageContext, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [id, userId, DEFAULT_CONVERSATION_TITLE, nowPreview, pageContext],
  });

  return {
    id,
    title: DEFAULT_CONVERSATION_TITLE,
    preview: nowPreview,
    pageContext,
    messageCount: 0,
    updatedAt: new Date().toISOString(),
  } satisfies AssistantConversationSummary;
}

export async function deleteAssistantConversation(userId: string, conversationId: string) {
  await client.batch(
    [
      {
        sql: `DELETE FROM assistant_messages WHERE userId = ? AND conversationId = ?`,
        args: [userId, conversationId],
      },
      {
        sql: `DELETE FROM assistant_conversations WHERE userId = ? AND id = ?`,
        args: [userId, conversationId],
      },
    ],
    "write",
  );
}

export async function appendAssistantConversationMessage(options: {
  userId: string;
  conversationId: string;
  pageContext: AssistantContextPage;
  role: AssistantConversationMessage["role"];
  content: string;
}) {
  const content = normalizeAssistantMessage(options.content);
  if (!content) {
    return null;
  }

  const conversation = await ensureAssistantConversation(
    options.userId,
    options.conversationId,
    options.pageContext,
  );
  const messageId = randomUUID();
  const nextTitle =
    options.role === "user" && conversation.title === DEFAULT_CONVERSATION_TITLE
      ? deriveConversationTitle(content)
      : conversation.title;

  await client.batch(
    [
      {
        sql: `INSERT INTO assistant_messages
              (id, conversationId, userId, role, content, createdAt)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [messageId, conversation.id, options.userId, options.role, content],
      },
      {
        sql: `UPDATE assistant_conversations
              SET title = ?, lastPreview = ?, pageContext = ?, updatedAt = CURRENT_TIMESTAMP
              WHERE id = ? AND userId = ?`,
        args: [
          nextTitle,
          buildConversationPreview(content),
          options.pageContext,
          conversation.id,
          options.userId,
        ],
      },
    ],
    "write",
  );

  return {
    conversationId: conversation.id,
    title: nextTitle,
    preview: buildConversationPreview(content),
  };
}

export function buildAssistantContext(
  dashboard: DashboardData,
  pageContext: AssistantContextPage,
) {
  const shared = {
    student: {
      role: dashboard.settings.targetRole,
      goal: dashboard.settings.primaryGoal,
      planStyle: dashboard.settings.planStyle,
      weeklyTheme: dashboard.settings.weeklyTheme,
    },
    momentum: {
      currentStreak: dashboard.metrics.currentStreak,
      todayScore: dashboard.metrics.todayScore,
      weeklyDsa: dashboard.metrics.weekDsa,
      weeklyApplications: dashboard.metrics.weekApplications,
      weeklyBuilds: dashboard.metrics.weekBuilds,
    },
    plannerSummary: {
      active: dashboard.planner.summary.active,
      completed: dashboard.planner.summary.completed,
      todayOpen: dashboard.planner.summary.todayOpen,
    },
  };

  const contextByPage: Record<AssistantContextPage, unknown> = {
    home: {
      nextTasks: getNextTasks(dashboard, 3),
      recentSignals: buildRecentSignals(dashboard),
      today: {
        tomorrowTask: clipText(dashboard.today.tomorrowTask, 80),
        note: clipText(dashboard.today.note, 100),
      },
    },
    planner: {
      targets: {
        weekdayTaskTarget: dashboard.settings.weekdayTaskTarget,
        weekendTaskTarget: dashboard.settings.weekendTaskTarget,
        weeklyDsaTarget: dashboard.settings.weeklyDsaTarget,
        weeklyBuildTarget: dashboard.settings.weeklyBuildTarget,
        weeklyApplicationTarget: dashboard.settings.weeklyApplicationTarget,
      },
      nextTasks: getNextTasks(dashboard, 6),
      today: {
        tomorrowTask: clipText(dashboard.today.tomorrowTask, 80),
      },
    },
    logger: {
      recentSignals: buildRecentSignals(dashboard),
      latestLogs: {
        dsa: dashboard.recentDsa.slice(0, 3).map((entry) => ({
          title: clipText(entry.title, 50),
          pattern: entry.pattern,
        })),
        builds: dashboard.recentBuilds.slice(0, 3).map((entry) => ({
          title: clipText(entry.title, 50),
          area: entry.area,
        })),
        applications: dashboard.recentApplications.slice(0, 3).map((entry) => ({
          company: clipText(entry.company, 32),
          role: clipText(entry.role, 48),
          status: entry.status,
        })),
      },
    },
    progress: {
      weeklyTargets: dashboard.metrics.targetProgress,
      history: dashboard.history.slice(-7),
      recentSignals: buildRecentSignals(dashboard),
    },
    strategy: {
      weeklyTargets: dashboard.metrics.targetProgress,
      recentSignals: buildRecentSignals(dashboard),
      nextTasks: getNextTasks(dashboard, 4),
    },
    settings: {
      links: buildProfileLinks(dashboard),
      ai: {
        provider: dashboard.settings.aiProvider,
        model: dashboard.settings.openAiModel,
        customInstructions: clipText(dashboard.settings.customAiInstructions, 150),
      },
      plannerDefaults: {
        focusMinutes: dashboard.settings.timerFocusMinutes,
        breakMinutes: dashboard.settings.timerBreakMinutes,
        weekdayTaskTarget: dashboard.settings.weekdayTaskTarget,
        weekendTaskTarget: dashboard.settings.weekendTaskTarget,
      },
    },
  };

  return stableJsonStringify(compactObject({ pageContext, ...shared, page: contextByPage[pageContext] }));
}

export function buildRuleBasedAssistantReply(options: {
  dashboard: DashboardData;
  pageContext: AssistantContextPage;
  latestUserMessage: string;
  appliedSummary?: string;
}): string | null {
  const message = options.latestUserMessage.trim().toLowerCase();
  const nextTasks = getNextTasks(options.dashboard, 3);
  const firstTask = nextTasks[0];
  const weeklyOutputs =
    options.dashboard.metrics.weekDsa +
    options.dashboard.metrics.weekApplications +
    options.dashboard.metrics.weekBuilds;

  const baseNote = options.appliedSummary
    ? `Workspace updated:\n${options.appliedSummary}`
    : null;

  if (/(review my week|summarize progress|how am i doing|status update|weekly review)/i.test(message)) {
    return [
      baseNote,
      "Quick read:",
      `- Current streak: ${options.dashboard.metrics.currentStreak} day(s)`,
      `- Weekly output: ${weeklyOutputs} total items`,
      `- Open planner tasks: ${options.dashboard.planner.summary.active}`,
      firstTask
        ? `- Protect next: ${firstTask.title} (${firstTask.scope}, ${firstTask.priority})`
        : "- Protect next: create one specific task before opening more tabs",
      options.dashboard.today.tomorrowTask
        ? `- Tomorrow is already anchored to: ${clipText(options.dashboard.today.tomorrowTask, 110)}`
        : "- Tomorrow is not anchored yet, so close today by naming the first task now",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/(what should i do now|what next|next step|today focus|what now)/i.test(message)) {
    return [
      baseNote,
      firstTask
        ? `Best next move: ${firstTask.title}`
        : "Best next move: define one task before asking the workspace to do more.",
      firstTask?.details ? clipText(firstTask.details, 180) : null,
      `Why this now: ${describePagePriority(options.pageContext, options.dashboard)}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (/(plan tomorrow|tomorrow plan|how should i plan tomorrow)/i.test(message)) {
    const tomorrowAnchor =
      clipText(options.dashboard.today.tomorrowTask, 120) ||
      (firstTask ? firstTask.title : "Morning revision and one deep-work task");

    return [
      baseNote,
      "Tomorrow plan:",
      `- Open with: ${tomorrowAnchor}`,
      `- Deep work budget: ${options.dashboard.settings.weekdayDeepWorkMinutes} minutes`,
      `- Support block: ${options.dashboard.settings.weekdaySupportMinutes} minutes`,
      `- Daily task target: ${options.dashboard.settings.weekdayTaskTarget}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (/(links|profiles|settings|which provider|ai key|saved profiles)/i.test(message)) {
    const links = buildProfileLinks(options.dashboard);
    return [
      baseNote,
      "Workspace settings snapshot:",
      `- Active AI provider: ${options.dashboard.settings.aiProvider}`,
      `- Saved public links: ${links.length ? links.join(", ") : "none yet"}`,
      `- Plan style: ${clipText(options.dashboard.settings.planStyle, 120)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

function getAssistantConversationSummary(
  userId: string,
  conversationId: string,
): Promise<AssistantConversationSummary | null> {
  return client
    .execute({
      sql: `SELECT c.id,
                   c.title,
                   c.lastPreview,
                   c.pageContext,
                   c.createdAt,
                   c.updatedAt,
                   (
                     SELECT COUNT(*)
                     FROM assistant_messages m
                     WHERE m.userId = c.userId AND m.conversationId = c.id
                   ) AS messageCount
            FROM assistant_conversations c
            WHERE c.userId = ? AND c.id = ?
            LIMIT 1`,
      args: [userId, conversationId],
    })
    .then((result) => (result.rows[0] ? mapConversationSummary(result.rows[0]) : null));
}

function mapConversationSummary(row: Record<string, unknown>): AssistantConversationSummary {
  return {
    id: String(row.id),
    title: String(row.title ?? DEFAULT_CONVERSATION_TITLE),
    preview: String(row.lastPreview ?? "Continue the workspace conversation."),
    pageContext: normalizeAssistantPage(String(row.pageContext ?? "home")),
    messageCount: Number(row.messageCount ?? 0),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapConversationMessage(row: Record<string, unknown>): AssistantConversationMessage {
  return {
    id: String(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content ?? ""),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  };
}

function deriveConversationTitle(content: string) {
  const normalized = normalizeAssistantMessage(content).replace(/[.?!]+$/, "");
  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return clipText(normalized, 60);
}

function buildConversationPreview(content: string) {
  const normalized = normalizeAssistantMessage(content);
  return clipText(normalized, 120) || "Continue the workspace conversation.";
}

function normalizeAssistantMessage(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function getNextTasks(dashboard: DashboardData, limit: number) {
  return dashboard.planner.tasks
    .filter((task) => task.status !== "done")
    .slice()
    .sort((left, right) => {
      const priorityScore = priorityWeight(right.priority) - priorityWeight(left.priority);
      if (priorityScore !== 0) return priorityScore;
      if (left.scope === right.scope) return 0;
      return scopeWeight(left.scope) - scopeWeight(right.scope);
    })
    .slice(0, limit)
    .map((task) => ({
      title: clipText(task.title, 60),
      details: clipText(task.details, 80),
      scope: task.scope,
      priority: task.priority,
    }));
}

function buildRecentSignals(dashboard: DashboardData) {
  return {
    recentDsa: dashboard.recentDsa.slice(0, 3).map((entry) => ({
      title: clipText(entry.title, 50),
      pattern: entry.pattern,
    })),
    recentBuilds: dashboard.recentBuilds.slice(0, 3).map((entry) => ({
      title: clipText(entry.title, 50),
      area: entry.area,
    })),
    recentApplications: dashboard.recentApplications.slice(0, 3).map((entry) => ({
      company: clipText(entry.company, 32),
      role: clipText(entry.role, 48),
      status: entry.status,
    })),
  };
}

function buildProfileLinks(dashboard: DashboardData) {
  const labels = [
    dashboard.settings.githubUrl ? "GitHub" : null,
    dashboard.settings.leetcodeUrl ? "LeetCode" : null,
    dashboard.settings.linkedinUrl ? "LinkedIn" : null,
    dashboard.settings.portfolioUrl ? "Portfolio" : null,
    dashboard.settings.resumeUrl ? "Resume" : null,
    dashboard.settings.jobTrackerUrl ? "Job tracker" : null,
    dashboard.settings.codeforcesUrl ? "Codeforces" : null,
    dashboard.settings.codechefUrl ? "CodeChef" : null,
    dashboard.settings.hackerrankUrl ? "HackerRank" : null,
  ];

  return labels.filter(Boolean) as string[];
}

function describePagePriority(pageContext: AssistantContextPage, dashboard: DashboardData) {
  switch (pageContext) {
    case "planner":
      return `Planner is carrying ${dashboard.planner.summary.active} active task(s), so keep the next move narrow.`;
    case "logger":
      return "Logger works best when you capture proof quickly before momentum fades.";
    case "progress":
      return `Progress matters most when you compare today's score (${dashboard.metrics.todayScore}) against weekly output.`;
    case "strategy":
      return "Strategy should narrow your next week, not add more noise.";
    case "settings":
      return "Settings should only change what makes execution easier across the rest of the app.";
    case "home":
    default:
      return "Home should keep attention on the next concrete block, not the whole system at once.";
  }
}

function compactObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactObject(item))
      .filter((item) => item !== null && item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, compactObject(entry)])
        .filter(([, entry]) => {
          if (entry === null || entry === undefined) return false;
          if (typeof entry === "string") return entry.trim().length > 0;
          if (Array.isArray(entry)) return entry.length > 0;
          return true;
        }),
    ) as T;
  }

  return value;
}

function clipText(value: string | null | undefined, maxLength: number) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function priorityWeight(priority: string) {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function scopeWeight(scope: string) {
  switch (scope) {
    case "daily":
      return 0;
    case "weekly":
      return 1;
    default:
      return 2;
  }
}
