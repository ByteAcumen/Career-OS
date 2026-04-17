import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  createAiFingerprint,
  readAiArtifact,
  stableJsonStringify,
  writeAiArtifact,
  type AiArtifactFeature,
} from "@/lib/ai-cache";
import { resolveAiProviderKey } from "@/lib/ai-credentials";
import { getConfiguredAppBaseUrl } from "@/lib/app-url";
import { getDashboardData } from "@/lib/dashboard";
import {
  composeResumeDraft,
  type ResumeDraft,
  type ResumeProject,
  type ResumeSkillGroup,
} from "@/features/resume/build-resume";
import type {
  AiProvider,
  DashboardData,
  PlannerSuggestionPack,
  StudentStrategy,
} from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatStreamResult = {
  stream: ReadableStream<Uint8Array>;
  provider: AiProvider;
  model: string;
};

type ProviderHealthEntry = {
  until: number;
  code: AiErrorCode;
  message: string;
};

const aiDashboardOptions = {
  includeGithubActivity: false,
  includeIntegrations: false,
  includePreviousDay: false,
};

export type AiErrorCode =
  | "NO_KEY"
  | "INVALID_KEY"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "PARSE_ERROR";

export class AiError extends Error {
  code: AiErrorCode;
  provider: string;
  userMessage: string;
  retryable: boolean;

  constructor(
    code: AiErrorCode,
    provider: string,
    originalMessage: string,
    options?: { userMessage?: string; retryable?: boolean },
  ) {
    const userMessage = options?.userMessage ?? getErrorUserMessage(code, provider);
    super(originalMessage);
    this.name = "AiError";
    this.code = code;
    this.provider = provider;
    this.userMessage = userMessage;
    this.retryable =
      options?.retryable ?? (code === "RATE_LIMITED" || code === "TIMEOUT");
  }
}

function getErrorUserMessage(code: AiErrorCode, provider: string): string {
  switch (code) {
    case "NO_KEY":
      return `No API key configured for ${provider}. Add one in Settings -> AI Keys.`;
    case "INVALID_KEY":
      return `Your ${provider} API key is invalid or expired. Update it in Settings -> AI Keys.`;
    case "QUOTA_EXCEEDED":
      return `Your ${provider} quota is exhausted. Wait for reset, top up, or switch providers.`;
    case "RATE_LIMITED":
      return `${provider} rate limit reached. Wait a moment and try again.`;
    case "TIMEOUT":
      return `${provider} timed out. Try again in a moment.`;
    case "PROVIDER_ERROR":
      return `${provider} returned an unexpected error. Try again or switch providers.`;
    case "PARSE_ERROR":
      return `${provider} returned an unreadable response. Try again.`;
  }
}

function classifyHttpError(status: number, body: string, provider: string): AiError {
  if (status === 401 || status === 403) {
    return new AiError("INVALID_KEY", provider, `${provider} returned ${status}: ${body}`);
  }
  if (status === 429) {
    const lower = body.toLowerCase();
    if (lower.includes("quota") || lower.includes("billing") || lower.includes("exceeded")) {
      return new AiError("QUOTA_EXCEEDED", provider, `${provider} quota exceeded: ${body}`);
    }
    return new AiError("RATE_LIMITED", provider, `${provider} rate limited: ${body}`);
  }
  if (status === 408 || status === 504) {
    return new AiError("TIMEOUT", provider, `${provider} timed out: ${body}`);
  }
  return new AiError("PROVIDER_ERROR", provider, `${provider} returned ${status}: ${body}`);
}

const CoachResponseSchema = z.object({
  summary: z.string(),
  biggestRisk: z.string(),
  focusTheme: z.string(),
  morningPlan: z.string(),
  nightPlan: z.string(),
  applyPlan: z.string(),
  oneCut: z.string(),
  weekendMission: z.string(),
});

const MotivationSchema = z.object({
  quotes: z.array(z.string()).min(3).max(6),
});

const InsightSchema = z.object({
  insight: z.string(),
});

const WeaknessSchema = z.object({
  curriculum: z.string(),
});

const MatchSchema = z.object({
  score: z.number().min(0).max(100),
  analysis: z.string(),
});

const StudentStrategySchema = z.object({
  headline: z.string(),
  todayMission: z.string(),
  dsaPriority: z.string(),
  buildPriority: z.string(),
  applicationPriority: z.string(),
  mockInterviewTask: z.string(),
  realityCheck: z.string(),
});

const PlannerSuggestionItemSchema = z.object({
  title: z.string(),
  details: z.string(),
  scope: z.enum(["daily", "weekly", "weekend"]),
  category: z.enum([
    "revision",
    "dsa",
    "build",
    "application",
    "interview",
    "custom",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  estimateMinutes: z.number().int().min(15).max(480),
});

const PlannerSuggestionPackSchema = z.object({
  headline: z.string(),
  daily: z.array(PlannerSuggestionItemSchema).min(1).max(6),
  weekly: z.array(PlannerSuggestionItemSchema).min(1).max(8),
  weekend: z.array(PlannerSuggestionItemSchema).min(1).max(8),
});

const ResumeProjectSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().min(1).max(160),
  bullets: z.array(z.string().min(8).max(260)).min(1).max(4),
  link: z.string().url().nullable().optional(),
});

const ResumeSkillGroupSchema = z.object({
  label: z.string().min(1).max(60),
  items: z.array(z.string().min(1).max(80)).min(1).max(12),
});

const ResumeOptimizationSchema = z.object({
  matchedKeywords: z.array(z.string().min(1).max(80)).min(1).max(12),
  summaryBullets: z.array(z.string().min(8).max(260)).min(2).max(4),
  focusAreas: z.array(z.string().min(1).max(80)).min(4).max(10),
  skills: z.array(ResumeSkillGroupSchema).max(6).optional(),
  projectHighlights: z.array(ResumeProjectSchema).min(1).max(4),
  problemSolvingHighlights: z.array(z.string().min(8).max(260)).min(1).max(5),
  editingNotes: z.array(z.string().min(8).max(260)).min(2).max(6),
  improvementSummary: z.string().min(12).max(260),
});

const AssistantSettingsUpdateSchema = z
  .object({
    primaryGoal: z.string().max(260).optional(),
    targetRole: z.string().max(120).optional(),
    weeklyTheme: z.string().max(120).optional(),
    planStyle: z.string().max(220).optional(),
    weekdayTaskTarget: z.number().int().min(1).max(12).optional(),
    weekendTaskTarget: z.number().int().min(1).max(16).optional(),
    weeklyDsaTarget: z.number().int().min(1).max(50).optional(),
    weeklyApplicationTarget: z.number().int().min(1).max(50).optional(),
    weeklyBuildTarget: z.number().int().min(1).max(20).optional(),
    timerFocusMinutes: z.number().int().min(15).max(180).optional(),
    timerBreakMinutes: z.number().int().min(5).max(60).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one setting must be present.",
  });

const AssistantActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_task"),
    title: z.string().min(3).max(140),
    details: z.string().max(500).optional(),
    scope: z.enum(["daily", "weekly", "weekend"]),
    category: z.enum(["revision", "dsa", "build", "application", "interview", "custom"]),
    priority: z.enum(["high", "medium", "low"]),
    estimateMinutes: z.number().int().min(15).max(480),
    targetDateKey: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal("save_review"),
    note: z.string().max(900).optional(),
    tomorrowTask: z.string().max(220).optional(),
  }).refine((value) => value.note || value.tomorrowTask, {
    message: "Review update needs a note or tomorrow task.",
  }),
  z.object({
    type: z.literal("update_settings"),
    settings: AssistantSettingsUpdateSchema,
  }),
  z.object({
    type: z.literal("update_task_status"),
    taskId: z.string().min(8).max(120),
    title: z.string().min(1).max(160),
    status: z.enum(["todo", "in_progress", "done"]),
  }),
  z.object({
    type: z.literal("delete_task"),
    taskId: z.string().min(8).max(120),
    title: z.string().min(1).max(160),
  }),
  z.object({
    type: z.literal("log_dsa"),
    title: z.string().min(3).max(160),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    pattern: z.string().min(2).max(120),
    insight: z.string().max(500).optional(),
    repositoryUrl: z.string().url().optional(),
    dateKey: z.string().optional(),
  }),
  z.object({
    type: z.literal("log_build"),
    title: z.string().min(3).max(160),
    area: z.string().min(2).max(120),
    proof: z.string().max(500).optional(),
    impact: z.string().max(500).optional(),
    repositoryUrl: z.string().url().optional(),
    dateKey: z.string().optional(),
  }),
  z.object({
    type: z.literal("log_application"),
    company: z.string().min(2).max(120),
    role: z.string().min(2).max(160),
    status: z.string().min(2).max(120),
    note: z.string().max(500).optional(),
    roleUrl: z.string().url().optional(),
    dateKey: z.string().optional(),
  }),
]);

const AssistantActionPlanSchema = z.object({
  shouldAct: z.boolean(),
  actionReason: z.string(),
  actions: z.array(AssistantActionSchema).max(3),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type AssistantAction = z.infer<typeof AssistantActionSchema>;
export type AssistantActionPlan = z.infer<typeof AssistantActionPlanSchema>;

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_OPENROUTER_MODEL = "openrouter/auto";
const PROVIDER_ORDER: AiProvider[] = ["gemini", "openai", "openrouter"];
const CHAT_CONTEXT_MESSAGE_LIMIT = 8;
const CHAT_MAX_OUTPUT_TOKENS = 320;
const providerHealth = new Map<string, ProviderHealthEntry>();
const LOCAL_ACTION_PREFIXES = /\b(add|create|log|save|set|update|change|plan|schedule|record|track|mark|complete|finish|start|resume|reopen|delete|remove)\b/i;
const COACH_SYSTEM_PROMPT =
  "You are a strict but caring study coach for a final-year CS student targeting product engineering roles. Be direct, realistic, and actionable.";
const COACH_JSON_PROMPT =
  "Return only a JSON object with these exact string fields: summary, biggestRisk, focusTheme, morningPlan, nightPlan, applyPlan, oneCut, weekendMission.";

export async function generateMotivationQuotes(userId: string) {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = buildMotivationPayload(dashboard);
  const response = await runStructuredTask({
    userId,
    dashboard,
    feature: "motivation",
    payload,
    schema: MotivationSchema,
    systemPrompt:
      "You are an intense but constructive engineering career coach. Generate four short motivational lines grounded in the student's real momentum, not generic hype.",
    jsonPrompt:
      "Return only a JSON object with a single array field named quotes. Each quote must be one sentence and under 20 words.",
    cacheMinutes: 12 * 60,
  });

  return response.quotes;
}

export async function generateInsight(
  userId: string,
  type: "dsa" | "build",
  title: string,
  context: string,
) {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = compactObject({
    type,
    title: clipText(title, 120),
    context: clipText(context, 700),
    role: dashboard.settings.targetRole,
    goal: dashboard.settings.primaryGoal,
    customInstructions: clipText(dashboard.settings.customAiInstructions, 300),
  });

  const response = await runStructuredTask({
    userId,
    dashboard,
    feature: "insight",
    payload,
    schema: InsightSchema,
    systemPrompt:
      "You are a principal engineer mentoring a student. Produce one technical takeaway that is sharp, specific, and immediately useful.",
    jsonPrompt:
      "Return only a JSON object with a single string field named insight.",
    cacheMinutes: 7 * 24 * 60,
  });

  return response.insight;
}

export async function generateWeaknessCurriculum(userId: string) {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = compactObject({
    targetRole: dashboard.settings.targetRole,
    targetCompanies: dashboard.settings.targetCompanies,
    learningSignals: buildLearningSignals(dashboard),
    recentProblems: dashboard.recentDsa.slice(0, 8).map((item) => ({
      title: clipText(item.title, 90),
      difficulty: item.difficulty,
      pattern: item.pattern,
      insight: clipText(item.insight, 140),
    })),
  });

  const response = await runStructuredTask({
    userId,
    dashboard,
    feature: "weakness",
    payload,
    schema: WeaknessSchema,
    systemPrompt:
      "You are an expert technical interviewer. Analyze the student's recent DSA work and identify the highest-value weakness cluster to attack next.",
    jsonPrompt:
      "Return only a JSON object with a single string field named curriculum. Keep it short and practical.",
    cacheMinutes: 24 * 60,
  });

  return response.curriculum;
}

export async function predictApplicationMatch(
  userId: string,
  company: string,
  role: string,
) {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = compactObject({
    company: clipText(company, 120),
    role: clipText(role, 160),
    targetRole: dashboard.settings.targetRole,
    primaryGoal: dashboard.settings.primaryGoal,
    recentSignals: {
      weeklyApplications: dashboard.metrics.weekApplications,
      weeklyBuilds: dashboard.metrics.weekBuilds,
      weeklyDsa: dashboard.metrics.weekDsa,
      currentStreak: dashboard.metrics.currentStreak,
    },
    learningSignals: buildLearningSignals(dashboard),
    customInstructions: clipText(dashboard.settings.customAiInstructions, 260),
  });

  const response = await runStructuredTask({
    userId,
    dashboard,
    feature: "match",
    payload,
    schema: MatchSchema,
    systemPrompt:
      "You are an elite career matching assistant. Score fit for the role using only the stored student profile and recent evidence.",
    jsonPrompt:
      "Return only a JSON object with score as a number from 0 to 100 and analysis as one concise sentence.",
    cacheMinutes: 7 * 24 * 60,
  });

  return response;
}

export async function generateCoachResponse(userId: string) {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = buildCoachPayload(dashboard);

  return runStructuredTask({
    userId,
    dashboard,
    feature: "coach",
    payload,
    schema: CoachResponseSchema,
    systemPrompt: COACH_SYSTEM_PROMPT,
    jsonPrompt: COACH_JSON_PROMPT,
    cacheMinutes: 4 * 60,
  });
}

export async function generateStudentStrategy(userId: string): Promise<StudentStrategy> {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = buildStrategyPayload(dashboard);

  return runStructuredTask({
    userId,
    dashboard,
    feature: "strategy",
    payload,
    schema: StudentStrategySchema,
    systemPrompt:
      "You are an elite placement strategist for engineering students. Prioritize the highest-ROI moves using the student's actual momentum, targets, and weak spots.",
    jsonPrompt:
      "Return only a JSON object with these exact string fields: headline, todayMission, dsaPriority, buildPriority, applicationPriority, mockInterviewTask, realityCheck.",
    cacheMinutes: 6 * 60,
  });
}

export async function generatePlannerSuggestionPack(
  userId: string,
): Promise<PlannerSuggestionPack> {
  const dashboard = await getDashboardData(userId, undefined, aiDashboardOptions);
  const payload = buildPlannerPayload(dashboard);

  return runStructuredTask({
    userId,
    dashboard,
    feature: "planner",
    payload,
    schema: PlannerSuggestionPackSchema,
    systemPrompt:
      "You are an elite interview-preparation planner for students. Generate practical daily, weekly, and weekend tasks based on stored goals, momentum, weak patterns, and current workload. Weekend work should be more ambitious than weekday work.",
    jsonPrompt:
      "Return only a JSON object with these exact fields: headline, daily, weekly, weekend. Every task item must contain title, details, scope, category, priority, and estimateMinutes.",
    cacheMinutes: 4 * 60,
  });
}

export async function optimizeResumeDraftWithAi(options: {
  userId: string;
  dashboard: DashboardData;
  baseDraft: ResumeDraft;
  sourceResumeText?: string | null;
  sourceFileName?: string | null;
  jobDescription?: string | null;
}): Promise<ResumeDraft> {
  const resumeReference = clipText(options.sourceResumeText ?? "", 8_000);
  const jobDescription = clipText(options.jobDescription ?? "", 6_000);
  const customInstructions = clipText(options.dashboard.settings.customAiInstructions, 400);

  if (!resumeReference && !jobDescription) {
    return options.baseDraft;
  }

    const payload = compactObject({
      header: options.baseDraft.header,
      targetRole: options.baseDraft.targetRole,
      company: options.baseDraft.company,
      matchedKeywords: options.baseDraft.matchedKeywords,
      summaryBullets: options.baseDraft.summaryBullets,
      focusAreas: options.baseDraft.focusAreas,
      skills: options.baseDraft.skills,
      projectHighlights: options.baseDraft.projectHighlights,
      problemSolvingHighlights: options.baseDraft.problemSolvingHighlights,
      editingNotes: options.baseDraft.editingNotes,
    sourceResumeFileName: options.sourceFileName?.trim(),
    sourceResumeText: resumeReference || undefined,
    jobDescription: jobDescription || undefined,
    recentSignals: {
      weeklyBuilds: options.dashboard.metrics.weekBuilds,
      weeklyDsa: options.dashboard.metrics.weekDsa,
      weeklyApplications: options.dashboard.metrics.weekApplications,
      currentStreak: options.dashboard.metrics.currentStreak,
    },
    settings: {
      primaryGoal: options.dashboard.settings.primaryGoal,
      targetRole: options.dashboard.settings.targetRole,
      targetCompanies: options.dashboard.settings.targetCompanies,
      weeklyTheme: options.dashboard.settings.weeklyTheme,
      planStyle: options.dashboard.settings.planStyle,
      customInstructions,
    },
  });

  const { data } = await dispatchWithFallback({
    payload,
    preferredProvider: options.dashboard.settings.aiProvider,
    configuredModel: options.dashboard.settings.openAiModel,
    schema: ResumeOptimizationSchema,
    userId: options.userId,
      systemPrompt:
        "You are an elite technical resume editor for engineering students. Improve the resume only using truthful evidence from the provided draft, uploaded resume text, job description, and stored dashboard context. Keep ATS-friendly language, preserve concrete proof, prefer quantified outcomes, and never invent projects, companies, metrics, or skills that are not supported by the provided material.",
      jsonPrompt:
        "Return only JSON with matchedKeywords, summaryBullets, focusAreas, skills, projectHighlights, problemSolvingHighlights, editingNotes, and improvementSummary. Keep bullets sharp, outcome-focused, ATS-friendly, and recruiter-readable.",
    });

    return composeResumeDraft(options.baseDraft, {
      mode: "ai-optimized",
      matchedKeywords: data.matchedKeywords,
      summaryBullets: data.summaryBullets,
      focusAreas: data.focusAreas,
      skills: data.skills?.map(normalizeResumeSkillGroup),
      projectHighlights: data.projectHighlights.map(normalizeResumeProject),
      problemSolvingHighlights: data.problemSolvingHighlights,
      editingNotes: data.editingNotes,
    improvementSummary: data.improvementSummary,
    importedResume: {
      used: options.baseDraft.importedResume.used || Boolean(resumeReference),
      fileName:
        options.sourceFileName?.trim() ||
        options.baseDraft.importedResume.fileName ||
        null,
    },
  });
}

export function buildChatContext(dashboard: DashboardData) {
  return stableJsonStringify(
    compactObject({
      profile: {
        goal: dashboard.settings.primaryGoal,
        role: dashboard.settings.targetRole,
        companies: splitCompanies(dashboard.settings.targetCompanies).slice(0, 6),
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
      planner: {
        active: dashboard.planner.summary.active,
        completed: dashboard.planner.summary.completed,
        todayOpen: dashboard.planner.summary.todayOpen,
      },
      learningSignals: buildLearningSignals(dashboard),
      recentDsa: dashboard.recentDsa.slice(0, 4).map((item) => ({
        title: clipText(item.title, 70),
        pattern: item.pattern,
      })),
      recentBuilds: dashboard.recentBuilds.slice(0, 3).map((item) => ({
        title: clipText(item.title, 70),
        area: item.area,
      })),
      recentApplications: dashboard.recentApplications.slice(0, 4).map((item) => ({
        company: clipText(item.company, 40),
        role: clipText(item.role, 60),
        status: item.status,
      })),
    }),
  );
}

export async function streamChat(
  userId: string,
  messages: ChatMessage[],
  dashboardContext: string,
  preferredProvider: AiProvider,
  configuredModel: string,
): Promise<ChatStreamResult> {
  const systemMessage = `You are Career OS Assistant, an embedded interview-prep coach inside a student's private dashboard.

You have access to current user context:
${dashboardContext}

Guidelines:
- Be concise, specific, and honest.
- Use the user's real momentum, planner, recent DSA work, builds, and applications.
- Prefer next actions over long explanations.
- If the user is behind, say so clearly and suggest the smallest meaningful recovery step.
- When the user asks for a plan, return a tight plan that is immediately usable, not a giant brainstorm.
- When the user asks for a workspace change, respond as if you are operating inside the app and be explicit about what changed or what still needs clarification.
- Keep answers structured for scanning: one short opening sentence, then only the bullets or sections that actually help.
- Default to 140 words or less unless the user explicitly asks for detail.
- Prefer 2 to 4 bullets over long paragraphs.
- Avoid nested lists, filler intros, and repeated context the user can already see on screen.
- Use markdown lists only when they improve clarity.`;

  const boundedMessages = normalizeChatMessages(messages);
  const orderedProviders = buildOrderedProviders(preferredProvider);
  const errors: AiError[] = [];
  const skippedErrors: AiError[] = [];

  for (const provider of orderedProviders) {
    const apiKey = await resolveAiProviderKey(userId, provider);
    if (!apiKey) continue;

    const cooldown = readProviderCooldown(userId, provider);
    if (cooldown) {
      skippedErrors.push(cooldown);
      continue;
    }

    const model = resolveProviderModel(provider, configuredModel);

    try {
      if (provider === "gemini") {
        clearProviderCooldown(userId, provider);
        return {
          stream: await streamGemini(apiKey, model, systemMessage, boundedMessages),
          provider,
          model,
        };
      }

      if (provider === "openai") {
        clearProviderCooldown(userId, provider);
        return {
          stream: await streamOpenAI(apiKey, model, systemMessage, boundedMessages),
          provider,
          model,
        };
      }

      clearProviderCooldown(userId, provider);
      return {
        stream: await streamOpenRouter(apiKey, model, systemMessage, boundedMessages),
        provider,
        model,
      };
    } catch (error) {
      const aiError =
        error instanceof AiError
          ? error
          : new AiError("PROVIDER_ERROR", provider, String(error));
      errors.push(aiError);
      markProviderCooldown(userId, provider, aiError);
      console.warn(`[AI] ${provider} stream failed (${aiError.code}): ${aiError.message}`);
    }
  }

  if (errors.length === 0) {
    if (skippedErrors.length > 0) {
      throw combineProviderErrors(skippedErrors);
    }
    throw new AiError("NO_KEY", "any", "No AI provider configured");
  }

  throw combineProviderErrors(errors, skippedErrors);
}

async function runStructuredTask<T extends z.ZodTypeAny>(options: {
  userId: string;
  dashboard: DashboardData;
  feature: AiArtifactFeature;
  payload: unknown;
  schema: T;
  systemPrompt: string;
  jsonPrompt: string;
  cacheMinutes: number;
}): Promise<z.infer<T>> {
  const fingerprint = createAiFingerprint({
    feature: options.feature,
    provider: options.dashboard.settings.aiProvider,
    model: options.dashboard.settings.openAiModel,
    payload: options.payload,
  });

  const cached = await readAiArtifact({
    userId: options.userId,
    feature: options.feature,
    fingerprint,
    schema: options.schema,
    maxAgeMinutes: options.cacheMinutes,
  });

  if (cached) {
    return cached;
  }

  const dispatched = await dispatchWithFallback({
    payload: options.payload,
    preferredProvider: options.dashboard.settings.aiProvider,
    configuredModel: options.dashboard.settings.openAiModel,
    systemPrompt: options.systemPrompt,
    jsonPrompt: options.jsonPrompt,
    schema: options.schema,
    userId: options.userId,
  });

  await writeAiArtifact({
    userId: options.userId,
    feature: options.feature,
    fingerprint,
    provider: dispatched.provider,
    model: dispatched.model,
    payload: dispatched.data,
  });

  return dispatched.data;
}

async function dispatchWithFallback<T extends z.ZodTypeAny>(options: {
  payload: unknown;
  preferredProvider: AiProvider;
  configuredModel: string;
  systemPrompt: string;
  jsonPrompt: string;
  schema: T;
  userId: string;
}): Promise<{ data: z.infer<T>; provider: AiProvider; model: string }> {
  const orderedProviders = buildOrderedProviders(options.preferredProvider);
  const errors: AiError[] = [];
  const skippedErrors: AiError[] = [];

  for (const provider of orderedProviders) {
    const apiKey = await resolveAiProviderKey(options.userId, provider);
    if (!apiKey) continue;

    const cooldown = readProviderCooldown(options.userId, provider);
    if (cooldown) {
      skippedErrors.push(cooldown);
      continue;
    }

    const model = resolveProviderModel(provider, options.configuredModel);

    try {
      const data = await dispatchToProvider(
        options.payload,
        provider,
        model,
        options.systemPrompt,
        options.jsonPrompt,
        options.schema,
        apiKey,
      );

      clearProviderCooldown(options.userId, provider);
      return { data, provider, model };
    } catch (error) {
      const aiError =
        error instanceof AiError
          ? error
          : new AiError("PROVIDER_ERROR", provider, String(error));
      errors.push(aiError);
      markProviderCooldown(options.userId, provider, aiError);
      console.warn(`[AI] ${provider} failed (${aiError.code}): ${aiError.message}`);
    }
  }

  if (errors.length === 0) {
    if (skippedErrors.length > 0) {
      throw combineProviderErrors(skippedErrors);
    }
    throw new AiError(
      "NO_KEY",
      "any",
      "No AI provider is configured. Add a provider key in Settings -> AI Keys.",
    );
  }

  throw combineProviderErrors(errors, skippedErrors);
}

async function dispatchToProvider<T extends z.ZodTypeAny>(
  payload: unknown,
  provider: AiProvider,
  model: string,
  systemPrompt: string,
  jsonPrompt: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  if (provider === "openai") {
    return generateWithOpenAI(payload, model, systemPrompt, schema, apiKey);
  }
  if (provider === "gemini") {
    return generateWithGemini(payload, model, systemPrompt, jsonPrompt, schema, apiKey);
  }
  return generateWithOpenRouter(payload, model, systemPrompt, jsonPrompt, schema, apiKey);
}

async function generateWithOpenAI<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  systemPrompt: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  try {
    const client = new OpenAI({ apiKey });

    const response = await client.responses.parse({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: stableJsonStringify(payload) },
      ],
      text: {
        format: zodTextFormat(schema, "response"),
      },
    });

    const output = response.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .find((item) => item.type === "output_text" && item.parsed);

    if (!output || output.type !== "output_text" || !output.parsed) {
      throw new AiError("PARSE_ERROR", "OpenAI", "OpenAI response could not be parsed");
    }

    return output.parsed as z.infer<T>;
  } catch (error) {
    throw normalizeProviderError(error, "OpenAI");
  }
}

async function generateWithGemini<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  systemPrompt: string,
  jsonPrompt: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [
              {
                text: `${jsonPrompt}\n${stableJsonStringify(payload)}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw classifyHttpError(response.status, body, "Gemini");
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text =
    data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") ?? "";

  try {
    return parseJsonWithSchema(text, schema);
  } catch {
    throw new AiError("PARSE_ERROR", "Gemini", `Failed to parse Gemini response: ${text.slice(0, 200)}`);
  }
}

async function generateWithOpenRouter<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  systemPrompt: string,
  jsonPrompt: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  const candidates = buildOpenRouterModelCandidates(model);
  let lastError: AiError | null = null;

  for (const candidate of candidates) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": getApplicationOrigin(),
        "X-OpenRouter-Title": "Career OS",
      },
      body: JSON.stringify({
        model: candidate,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${jsonPrompt}\n${stableJsonStringify(payload)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const error = classifyHttpError(response.status, body, "OpenRouter");
      if (shouldRetryOpenRouterWithAlternateModel(candidate, error)) {
        lastError = error;
        continue;
      }
      throw error;
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const text = data.choices?.[0]?.message?.content ?? "";

    try {
      return parseJsonWithSchema(text, schema);
    } catch {
      throw new AiError(
        "PARSE_ERROR",
        "OpenRouter",
        `Failed to parse OpenRouter response: ${text.slice(0, 200)}`,
      );
    }
  }

  throw (
    lastError ??
    new AiError("PROVIDER_ERROR", "OpenRouter", "OpenRouter did not return a usable response")
  );
}

async function tryOpenRouterStream(
  apiKey: string,
  model: string,
  systemMessage: string,
  messages: ChatMessage[],
) {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": getApplicationOrigin(),
      "X-OpenRouter-Title": "Career OS",
    },
  });

  return client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
    temperature: 0.35,
    max_completion_tokens: CHAT_MAX_OUTPUT_TOKENS,
  });
}

export async function planAssistantActions(options: {
  userId: string;
  dashboard: DashboardData;
  messages: ChatMessage[];
  preferredProvider: AiProvider;
  configuredModel: string;
}): Promise<AssistantActionPlan> {
  const boundedMessages = normalizeChatMessages(options.messages).slice(-6);
  const payload = compactObject({
    latestUserMessage: boundedMessages.filter((message) => message.role === "user").at(-1)?.content,
    recentMessages: boundedMessages,
    dateKey: options.dashboard.today.dateKey,
    settings: {
      primaryGoal: options.dashboard.settings.primaryGoal,
      targetRole: options.dashboard.settings.targetRole,
      weeklyTheme: options.dashboard.settings.weeklyTheme,
      planStyle: options.dashboard.settings.planStyle,
      weekdayTaskTarget: options.dashboard.settings.weekdayTaskTarget,
      weekendTaskTarget: options.dashboard.settings.weekendTaskTarget,
      weeklyDsaTarget: options.dashboard.settings.weeklyDsaTarget,
      weeklyApplicationTarget: options.dashboard.settings.weeklyApplicationTarget,
      weeklyBuildTarget: options.dashboard.settings.weeklyBuildTarget,
      timerFocusMinutes: options.dashboard.settings.timerFocusMinutes,
      timerBreakMinutes: options.dashboard.settings.timerBreakMinutes,
    },
    plannerSummary: options.dashboard.planner.summary,
    plannerTasks: options.dashboard.planner.tasks
      .filter((task) => task.status !== "done")
      .slice(0, 12)
      .map((task) => ({
        id: task.id,
        title: clipText(task.title, 90),
        scope: task.scope,
        category: task.category,
        priority: task.priority,
        status: task.status,
        targetDateKey: task.targetDateKey,
      })),
    today: {
      tomorrowTask: options.dashboard.today.tomorrowTask,
      note: clipText(options.dashboard.today.note, 220),
    },
  });

  const { data } = await dispatchWithFallback({
    payload,
    preferredProvider: options.preferredProvider,
    configuredModel: options.configuredModel,
    schema: AssistantActionPlanSchema,
    userId: options.userId,
    systemPrompt:
      "You are a safe workspace operator inside Career OS. Convert an explicit user request into zero or more workspace actions. Only create actions when the user clearly asks to save, add, log, set, update, complete, reopen, delete, or plan something inside the app. Use taskId only from the provided plannerTasks when changing or deleting an existing task. Never invent missing details, never clear history, never remove multiple tasks at once, and never make broad settings changes unless the user explicitly asked. If the request is advisory, ambiguous, or just conversational, return shouldAct false with no actions.",
    jsonPrompt:
      "Return only JSON with shouldAct, actionReason, and actions. Use at most 3 actions. Allowed actions are create_task, save_review, update_settings, update_task_status, delete_task, log_dsa, log_build, and log_application.",
  });

  return data;
}

export function planAssistantActionsLocally(options: {
  dashboard: DashboardData;
  messages: ChatMessage[];
}): AssistantActionPlan | null {
  const latestUserMessage =
    normalizeChatMessages(options.messages)
      .filter((message) => message.role === "user")
      .at(-1)?.content ?? "";

  if (!latestUserMessage || !LOCAL_ACTION_PREFIXES.test(latestUserMessage)) {
    return null;
  }

  const normalized = latestUserMessage.trim();
  const reviewAction = parseReviewAction(normalized);
  if (reviewAction) {
    return {
      shouldAct: true,
      actionReason: "Parsed an explicit tomorrow-task or review update locally.",
      actions: [reviewAction],
    };
  }

  const settingsAction = parseSettingsAction(normalized);
  if (settingsAction) {
    return {
      shouldAct: true,
      actionReason: "Parsed a direct settings change locally.",
      actions: [settingsAction],
    };
  }

  const taskAction = parseTaskLifecycleAction(options.dashboard, normalized);
  if (taskAction) {
    return {
      shouldAct: true,
      actionReason: "Parsed a direct task lifecycle change locally.",
      actions: [taskAction],
    };
  }

  return null;
}

function normalizeResumeProject(project: ResumeProject): ResumeProject {
  return {
    title: clipText(project.title.trim(), 160),
    subtitle: clipText(project.subtitle.trim(), 160) || "Project",
    link: project.link?.trim() || null,
    bullets: project.bullets
      .map((bullet) => clipText(bullet.trim(), 260))
      .filter(Boolean)
      .slice(0, 4),
  };
}

function normalizeResumeSkillGroup(group: ResumeSkillGroup): ResumeSkillGroup {
  return {
    label: clipText(group.label.trim(), 60),
    items: group.items
      .map((item) => clipText(item.trim(), 80))
      .filter(Boolean)
      .slice(0, 12),
  };
}

async function streamGemini(
  apiKey: string,
  model: string,
  systemMessage: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemMessage }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw classifyHttpError(response.status, body, "Gemini");
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        } catch {
          continue;
        }
      }
    },
  });
}

async function streamOpenAI(
  apiKey: string,
  model: string,
  systemMessage: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  try {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: systemMessage }, ...messages],
      stream: true,
      temperature: 0.35,
      max_completion_tokens: CHAT_MAX_OUTPUT_TOKENS,
    });

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });
  } catch (error) {
    throw normalizeProviderError(error, "OpenAI");
  }
}

async function streamOpenRouter(
  apiKey: string,
  model: string,
  systemMessage: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const candidates = buildOpenRouterModelCandidates(model);
  let stream:
    | Awaited<ReturnType<typeof tryOpenRouterStream>>
    | null = null;
  let lastError: AiError | null = null;

  for (const candidate of candidates) {
    try {
      stream = await tryOpenRouterStream(apiKey, candidate, systemMessage, messages);
      break;
    } catch (error) {
      const normalized = normalizeProviderError(error, "OpenRouter");
      if (shouldRetryOpenRouterWithAlternateModel(candidate, normalized)) {
        lastError = normalized;
        continue;
      }
      throw normalized;
    }
  }

  if (!stream) {
    throw (
      lastError ??
      new AiError("PROVIDER_ERROR", "OpenRouter", "OpenRouter streaming could not start")
    );
  }

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });
}

function normalizeProviderError(error: unknown, provider: string): AiError {
  if (error instanceof AiError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("401") || message.includes("Incorrect API key")) {
    return new AiError("INVALID_KEY", provider, message);
  }
  if (message.includes("429")) {
    if (message.toLowerCase().includes("quota")) {
      return new AiError("QUOTA_EXCEEDED", provider, message);
    }
    return new AiError("RATE_LIMITED", provider, message);
  }
  if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
    return new AiError("TIMEOUT", provider, message);
  }

  return new AiError("PROVIDER_ERROR", provider, message);
}

function buildOrderedProviders(preferredProvider: AiProvider): AiProvider[] {
  return [
    preferredProvider,
    ...PROVIDER_ORDER.filter((provider) => provider !== preferredProvider),
  ];
}

function buildOpenRouterModelCandidates(requestedModel: string) {
  return Array.from(
    new Set(
      [
        requestedModel?.trim(),
        DEFAULT_OPENROUTER_MODEL,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

function resolveProviderModel(provider: AiProvider, configuredModel: string) {
  if (provider === "openai") {
    return configuredModel && configuredModel.startsWith("gpt")
      ? configuredModel
      : DEFAULT_OPENAI_MODEL;
  }

  if (provider === "gemini") {
    return configuredModel && configuredModel.startsWith("gemini")
      ? configuredModel
      : DEFAULT_GEMINI_MODEL;
  }

  return configuredModel &&
    !configuredModel.startsWith("gpt") &&
    !configuredModel.startsWith("gemini")
    ? configuredModel
    : DEFAULT_OPENROUTER_MODEL;
}

function shouldRetryOpenRouterWithAlternateModel(model: string, error: AiError) {
  if (model === DEFAULT_OPENROUTER_MODEL) {
    return false;
  }

  const lowerMessage = error.message.toLowerCase();
  return (
    error.code === "PROVIDER_ERROR" &&
    (lowerMessage.includes("404") ||
      lowerMessage.includes("no endpoints found") ||
      lowerMessage.includes("unknown model") ||
      lowerMessage.includes("not found"))
  );
}

function readProviderCooldown(userId: string, provider: AiProvider) {
  const key = `${userId}:${provider}`;
  const value = providerHealth.get(key);
  if (!value) {
    return null;
  }

  if (value.until <= Date.now()) {
    providerHealth.delete(key);
    return null;
  }

  const seconds = Math.max(1, Math.ceil((value.until - Date.now()) / 1000));
  return new AiError(value.code, provider, value.message, {
    userMessage:
      value.code === "QUOTA_EXCEEDED" || value.code === "INVALID_KEY"
        ? `${provider} is temporarily skipped for ${seconds}s after the last failure. Another provider will be used if available.`
        : `${provider} is cooling down for ${seconds}s after the last failure. Another provider will be used if available.`,
    retryable: true,
  });
}

function clearProviderCooldown(userId: string, provider: AiProvider) {
  providerHealth.delete(`${userId}:${provider}`);
}

function markProviderCooldown(userId: string, provider: AiProvider, error: AiError) {
  const durationMs = getProviderCooldownMs(error.code);
  if (!durationMs) {
    clearProviderCooldown(userId, provider);
    return;
  }

  providerHealth.set(`${userId}:${provider}`, {
    until: Date.now() + durationMs,
    code: error.code,
    message: error.message,
  });
}

function getProviderCooldownMs(code: AiErrorCode) {
  switch (code) {
    case "INVALID_KEY":
      return 10 * 60_000;
    case "QUOTA_EXCEEDED":
      return 5 * 60_000;
    case "RATE_LIMITED":
      return 30_000;
    case "TIMEOUT":
      return 45_000;
    case "PROVIDER_ERROR":
      return 90_000;
    default:
      return 0;
  }
}

function combineProviderErrors(errors: AiError[], skippedErrors: AiError[] = []) {
  const combined = [...errors, ...skippedErrors];
  const code = pickAggregateErrorCode(combined);
  const summary = combined
    .map((error) => `${error.provider}: ${error.userMessage}`)
    .join(" ");

  return new AiError(code, "multiple", combined.map((error) => error.message).join(" | "), {
    userMessage:
      summary ||
      "All configured AI providers are currently unavailable. Check your keys, quota, or try again shortly.",
    retryable: combined.some((error) => error.retryable),
  });
}

function pickAggregateErrorCode(errors: AiError[]): AiErrorCode {
  if (errors.some((error) => error.code === "RATE_LIMITED")) return "RATE_LIMITED";
  if (errors.some((error) => error.code === "TIMEOUT")) return "TIMEOUT";
  if (errors.some((error) => error.code === "QUOTA_EXCEEDED")) return "QUOTA_EXCEEDED";
  if (errors.some((error) => error.code === "INVALID_KEY")) return "INVALID_KEY";
  if (errors.some((error) => error.code === "PARSE_ERROR")) return "PARSE_ERROR";
  if (errors.some((error) => error.code === "PROVIDER_ERROR")) return "PROVIDER_ERROR";
  return "NO_KEY";
}

function buildMotivationPayload(dashboard: DashboardData) {
  return compactObject({
    student: {
      targetRole: dashboard.settings.targetRole,
      primaryGoal: dashboard.settings.primaryGoal,
      weeklyTheme: dashboard.settings.weeklyTheme,
      planStyle: dashboard.settings.planStyle,
    },
    momentum: {
      currentStreak: dashboard.metrics.currentStreak,
      todayScore: dashboard.metrics.todayScore,
      weeklyDsa: dashboard.metrics.weekDsa,
      weeklyApplications: dashboard.metrics.weekApplications,
      weeklyBuilds: dashboard.metrics.weekBuilds,
    },
    today: {
      completedCheckins: countCompletedCheckins(dashboard.today.checkins),
      tomorrowTask: clipText(dashboard.today.tomorrowTask, 120),
    },
    planner: {
      todayOpen: dashboard.planner.summary.todayOpen,
      active: dashboard.planner.summary.active,
    },
  });
}

function buildCoachPayload(dashboard: DashboardData) {
  return compactObject({
    student: buildStudentProfile(dashboard),
    momentum: buildMomentumSnapshot(dashboard),
    planning: buildPlannerSnapshot(dashboard),
    learningSignals: buildLearningSignals(dashboard),
    historyTrend: buildHistoryTrend(dashboard),
    recentWork: {
      dsa: dashboard.recentDsa.slice(0, 4).map((item) => ({
        title: clipText(item.title, 80),
        pattern: item.pattern,
        insight: clipText(item.insight, 120),
      })),
      builds: dashboard.recentBuilds.slice(0, 3).map((item) => ({
        title: clipText(item.title, 80),
        area: item.area,
        impact: clipText(item.impact, 120),
      })),
      applications: dashboard.recentApplications.slice(0, 4).map((item) => ({
        company: clipText(item.company, 40),
        role: clipText(item.role, 60),
        status: item.status,
      })),
    },
    today: {
      note: clipText(dashboard.today.note, 180),
      tomorrowTask: clipText(dashboard.today.tomorrowTask, 120),
      completedCheckins: countCompletedCheckins(dashboard.today.checkins),
    },
  });
}

function buildStrategyPayload(dashboard: DashboardData) {
  return compactObject({
    student: buildStudentProfile(dashboard),
    momentum: buildMomentumSnapshot(dashboard),
    learningSignals: buildLearningSignals(dashboard),
    historyTrend: buildHistoryTrend(dashboard),
    planTargets: {
      weeklyDsaTarget: dashboard.settings.weeklyDsaTarget,
      weeklyApplicationTarget: dashboard.settings.weeklyApplicationTarget,
      weeklyBuildTarget: dashboard.settings.weeklyBuildTarget,
      weekdayTaskTarget: dashboard.settings.weekdayTaskTarget,
      weekendTaskTarget: dashboard.settings.weekendTaskTarget,
    },
    planner: buildPlannerSnapshot(dashboard),
  });
}

function buildPlannerPayload(dashboard: DashboardData) {
  return compactObject({
    student: buildStudentProfile(dashboard),
    momentum: buildMomentumSnapshot(dashboard),
    learningSignals: buildLearningSignals(dashboard),
    planTargets: {
      weeklyTheme: dashboard.settings.weeklyTheme,
      weekdayTaskTarget: dashboard.settings.weekdayTaskTarget,
      weekendTaskTarget: dashboard.settings.weekendTaskTarget,
      weeklyDsaTarget: dashboard.settings.weeklyDsaTarget,
      weeklyApplicationTarget: dashboard.settings.weeklyApplicationTarget,
      weeklyBuildTarget: dashboard.settings.weeklyBuildTarget,
      weekdayDeepWorkMinutes: dashboard.settings.weekdayDeepWorkMinutes,
      weekdaySupportMinutes: dashboard.settings.weekdaySupportMinutes,
      weekendDsaMinutes: dashboard.settings.weekendDsaMinutes,
      weekendBuildMinutes: dashboard.settings.weekendBuildMinutes,
    },
    planner: {
      summary: dashboard.planner.summary,
      activeDaily: dashboard.planner.tasks
        .filter((task) => task.scope === "daily" && task.status !== "done")
        .slice(0, 5)
        .map((task) => ({
          title: clipText(task.title, 80),
          category: task.category,
          priority: task.priority,
          estimateMinutes: task.estimateMinutes,
        })),
      activeWeekly: dashboard.planner.tasks
        .filter((task) => task.scope !== "daily" && task.status !== "done")
        .slice(0, 6)
        .map((task) => ({
          title: clipText(task.title, 80),
          scope: task.scope,
          category: task.category,
          priority: task.priority,
          estimateMinutes: task.estimateMinutes,
        })),
    },
    today: {
      completedCheckins: countCompletedCheckins(dashboard.today.checkins),
      note: clipText(dashboard.today.note, 160),
      tomorrowTask: clipText(dashboard.today.tomorrowTask, 120),
    },
  });
}

function buildStudentProfile(dashboard: DashboardData) {
  return compactObject({
    targetRole: dashboard.settings.targetRole,
    primaryGoal: dashboard.settings.primaryGoal,
    targetCompanies: splitCompanies(dashboard.settings.targetCompanies).slice(0, 8),
    university: dashboard.settings.university,
    degree: dashboard.settings.degree,
    graduationYear: dashboard.settings.graduationYear,
    planStyle: dashboard.settings.planStyle,
    weeklyTheme: dashboard.settings.weeklyTheme,
    linkedProfiles: listEnabledProfiles(dashboard),
    customInstructions: clipText(dashboard.settings.customAiInstructions, 300),
  });
}

function buildMomentumSnapshot(dashboard: DashboardData) {
  return {
    revisionStreak: dashboard.metrics.revisionStreak,
    currentStreak: dashboard.metrics.currentStreak,
    maxStreak: dashboard.metrics.maxStreak,
    totalXP: dashboard.metrics.totalXP,
    level: dashboard.metrics.level,
    todayScore: dashboard.metrics.todayScore,
    weeklyDsa: dashboard.metrics.weekDsa,
    weeklyApplications: dashboard.metrics.weekApplications,
    weeklyBuilds: dashboard.metrics.weekBuilds,
    targetProgress: dashboard.metrics.targetProgress,
  };
}

function buildPlannerSnapshot(dashboard: DashboardData) {
  return {
    totalTasks: dashboard.planner.summary.total,
    completedTasks: dashboard.planner.summary.completed,
    activeTasks: dashboard.planner.summary.active,
    todayOpenTasks: dashboard.planner.summary.todayOpen,
    daily: dashboard.planner.summary.daily,
    weekly: dashboard.planner.summary.weekly,
    weekend: dashboard.planner.summary.weekend,
  };
}

function buildLearningSignals(dashboard: DashboardData) {
  return compactObject({
    topPatterns: topCounts(dashboard.recentDsa.map((item) => item.pattern), 4),
    topBuildAreas: topCounts(dashboard.recentBuilds.map((item) => item.area), 3),
    applicationStatuses: topCounts(
      dashboard.recentApplications.map((item) => item.status),
      4,
    ),
    insightCoverage: {
      recentDsaWithInsights: dashboard.recentDsa.filter((item) => Boolean(item.insight)).length,
      recentDsaWithoutInsights: dashboard.recentDsa.filter((item) => !item.insight).length,
    },
  });
}

function buildHistoryTrend(dashboard: DashboardData) {
  const recent = dashboard.history.slice(-14);
  const latestWeek = recent.slice(-7);
  const previousWeek = recent.slice(0, Math.max(0, recent.length - 7));

  return {
    last7Days: aggregateHistory(latestWeek),
    previousWindow: aggregateHistory(previousWeek),
    activeDaysLast7: latestWeek.filter((item) => item.completedCount > 0).length,
  };
}

function aggregateHistory(history: DashboardData["history"]) {
  return history.reduce(
    (acc, item) => {
      acc.completed += item.completedCount;
      acc.dsa += item.dsaCount;
      acc.builds += item.buildCount;
      acc.applications += item.appCount;
      return acc;
    },
    { completed: 0, dsa: 0, builds: 0, applications: 0 },
  );
}

function parseReviewAction(message: string): AssistantAction | null {
  const tomorrowMatch = message.match(
    /(?:set|save|make|change|update)\s+(?:my\s+)?tomorrow(?:'s)?(?:\s+first)?\s+task\s+(?:to|as)\s+(.+)/i,
  );
  if (!tomorrowMatch) {
    return null;
  }

  const tomorrowTask = cleanCommandValue(tomorrowMatch[1]);
  if (!tomorrowTask) {
    return null;
  }

  return {
    type: "save_review",
    tomorrowTask,
  };
}

function parseSettingsAction(message: string): AssistantAction | null {
  const weeklyThemeMatch = message.match(
    /(?:set|change|update)\s+(?:the\s+)?weekly\s+theme\s+(?:to|as)\s+(.+)/i,
  );
  if (weeklyThemeMatch) {
    const weeklyTheme = cleanCommandValue(weeklyThemeMatch[1]);
    if (weeklyTheme) {
      return {
        type: "update_settings",
        settings: { weeklyTheme },
      };
    }
  }

  const primaryGoalMatch = message.match(
    /(?:set|change|update)\s+(?:the\s+)?primary\s+goal\s+(?:to|as)\s+(.+)/i,
  );
  if (primaryGoalMatch) {
    const primaryGoal = cleanCommandValue(primaryGoalMatch[1]);
    if (primaryGoal) {
      return {
        type: "update_settings",
        settings: { primaryGoal },
      };
    }
  }

  const targetRoleMatch = message.match(
    /(?:set|change|update)\s+(?:my\s+)?target\s+role\s+(?:to|as)\s+(.+)/i,
  );
  if (targetRoleMatch) {
    const targetRole = cleanCommandValue(targetRoleMatch[1]);
    if (targetRole) {
      return {
        type: "update_settings",
        settings: { targetRole },
      };
    }
  }

  const timerMatch = message.match(
    /(?:set|change|update)\s+(?:the\s+)?(?:focus\s+)?timer\s+(?:to|as)\s+(\d{1,3})(?:\s*(?:minutes|min|m))?(?:.*?(?:break|rest)(?:\s+timer)?\s*(?:to|as)?\s*(\d{1,2}))?/i,
  );
  if (timerMatch) {
    const timerFocusMinutes = Number(timerMatch[1]);
    const timerBreakMinutes = timerMatch[2] ? Number(timerMatch[2]) : undefined;
    const settings: Record<string, number> = {};

    if (Number.isFinite(timerFocusMinutes) && timerFocusMinutes >= 15 && timerFocusMinutes <= 180) {
      settings.timerFocusMinutes = timerFocusMinutes;
    }
    if (
      timerBreakMinutes !== undefined &&
      Number.isFinite(timerBreakMinutes) &&
      timerBreakMinutes >= 5 &&
      timerBreakMinutes <= 60
    ) {
      settings.timerBreakMinutes = timerBreakMinutes;
    }

    if (Object.keys(settings).length > 0) {
      return {
        type: "update_settings",
        settings,
      } as AssistantAction;
    }
  }

  const breakMatch = message.match(
    /(?:set|change|update)\s+(?:the\s+)?break(?:\s+timer)?\s+(?:to|as)\s+(\d{1,2})/i,
  );
  if (breakMatch) {
    const timerBreakMinutes = Number(breakMatch[1]);
    if (Number.isFinite(timerBreakMinutes) && timerBreakMinutes >= 5 && timerBreakMinutes <= 60) {
      return {
        type: "update_settings",
        settings: { timerBreakMinutes },
      };
    }
  }

  return null;
}

function parseTaskLifecycleAction(
  dashboard: DashboardData,
  message: string,
): AssistantAction | null {
  const deleteTarget =
    matchCommandValue(message, [
      /(?:delete|remove)\s+(?:the\s+)?(?:task\s+)?(.+)/i,
    ]) ?? null;

  if (deleteTarget) {
    const task = findPlannerTask(dashboard, deleteTarget);
    if (task) {
      return {
        type: "delete_task",
        taskId: task.id,
        title: task.title,
      };
    }
  }

  const doneTarget =
    matchCommandValue(message, [
      /(?:mark|set)\s+(?:the\s+)?(?:task\s+)?(.+?)\s+as\s+(?:done|complete|completed)/i,
      /(?:complete|finish)\s+(?:the\s+)?(?:task\s+)?(.+)/i,
    ]) ?? null;

  if (doneTarget) {
    const task = findPlannerTask(dashboard, doneTarget);
    if (task) {
      return {
        type: "update_task_status",
        taskId: task.id,
        title: task.title,
        status: "done",
      };
    }
  }

  const inProgressTarget =
    matchCommandValue(message, [
      /(?:mark|set)\s+(?:the\s+)?(?:task\s+)?(.+?)\s+as\s+(?:in progress|doing|active)/i,
      /(?:start|resume)\s+(?:the\s+)?(?:task\s+)?(.+)/i,
    ]) ?? null;

  if (inProgressTarget) {
    const task = findPlannerTask(dashboard, inProgressTarget);
    if (task) {
      return {
        type: "update_task_status",
        taskId: task.id,
        title: task.title,
        status: "in_progress",
      };
    }
  }

  const todoTarget =
    matchCommandValue(message, [
      /(?:mark|set)\s+(?:the\s+)?(?:task\s+)?(.+?)\s+as\s+(?:todo|to do|not started)/i,
      /(?:reopen|reset)\s+(?:the\s+)?(?:task\s+)?(.+)/i,
    ]) ?? null;

  if (todoTarget) {
    const task = findPlannerTask(dashboard, todoTarget);
    if (task) {
      return {
        type: "update_task_status",
        taskId: task.id,
        title: task.title,
        status: "todo",
      };
    }
  }

  return null;
}

function matchCommandValue(message: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const value = cleanCommandValue(match[1]);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function cleanCommandValue(value: string) {
  return value.replace(/\s+/g, " ").replace(/[.?!]+$/g, "").trim();
}

function findPlannerTask(dashboard: DashboardData, rawQuery: string) {
  const query = normalizeForMatch(rawQuery);
  if (!query) return null;

  const tasks = dashboard.planner.tasks.filter((task) => task.status !== "done");
  const exact = tasks.find((task) => normalizeForMatch(task.title) === query);
  if (exact) return exact;

  const contains = tasks.find((task) => normalizeForMatch(task.title).includes(query));
  if (contains) return contains;

  return tasks.find((task) => query.includes(normalizeForMatch(task.title))) ?? null;
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeChatMessages(messages: ChatMessage[]) {
  const cleaned = messages
    .map((message) => ({
      role: message.role,
      content: clipText(message.content, message.role === "user" ? 900 : 1200),
    }))
    .filter((message) => Boolean(message.content.trim()));

  while (cleaned.length > 0 && cleaned[0]?.role === "assistant") {
    cleaned.shift();
  }

  return cleaned.slice(-CHAT_CONTEXT_MESSAGE_LIMIT);
}

function listEnabledProfiles(dashboard: DashboardData) {
  const profiles = [
    dashboard.settings.githubUrl ? "github" : null,
    dashboard.settings.leetcodeUrl ? "leetcode" : null,
    dashboard.settings.linkedinUrl ? "linkedin" : null,
    dashboard.settings.portfolioUrl ? "portfolio" : null,
    dashboard.settings.codeforcesUrl ? "codeforces" : null,
    dashboard.settings.codechefUrl ? "codechef" : null,
    dashboard.settings.hackerrankUrl ? "hackerrank" : null,
    dashboard.settings.jobTrackerUrl ? "jobTracker" : null,
  ];

  return profiles.filter(Boolean);
}

function splitCompanies(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function topCounts(items: string[], limit: number) {
  const counts = new Map<string, number>();

  for (const item of items) {
    const normalized = item.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function countCompletedCheckins(checkins: DashboardData["today"]["checkins"]) {
  return Object.values(checkins).filter(Boolean).length;
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
        .map(([key, entryValue]) => [key, compactObject(entryValue)])
        .filter(([, entryValue]) => {
          if (entryValue === null || entryValue === undefined) return false;
          if (typeof entryValue === "string") return entryValue.trim().length > 0;
          if (Array.isArray(entryValue)) return entryValue.length > 0;
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

function parseJsonWithSchema<T extends z.ZodTypeAny>(text: string, schema: T): z.infer<T> {
  const cleaned = text.trim();
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? cleaned;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }

  return schema.parse(JSON.parse(raw.slice(start, end + 1)));
}

function getApplicationOrigin() {
  try {
    return new URL(getConfiguredAppBaseUrl()).origin;
  } catch {
    return "http://localhost:3000";
  }
}
