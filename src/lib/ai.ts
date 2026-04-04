import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { resolveAiProviderKey } from "@/lib/ai-credentials";
import { getConfiguredAppBaseUrl } from "@/lib/app-url";
import { getDashboardData } from "@/lib/dashboard";
import type { AiProvider, PlannerSuggestionPack, StudentStrategy } from "@/lib/types";

// ── Error Classification ──────────────────────────────────────────────────

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
  ) {
    const userMessage = getErrorUserMessage(code, provider);
    super(originalMessage);
    this.name = "AiError";
    this.code = code;
    this.provider = provider;
    this.userMessage = userMessage;
    this.retryable = code === "RATE_LIMITED" || code === "TIMEOUT";
  }
}

function getErrorUserMessage(code: AiErrorCode, provider: string): string {
  switch (code) {
    case "NO_KEY":
      return `No API key configured for ${provider}. Go to Settings → AI Keys to add one, or set it in your environment variables.`;
    case "INVALID_KEY":
      return `Your ${provider} API key is invalid or expired. Please update it in Settings → AI Keys.`;
    case "QUOTA_EXCEEDED":
      return `Your ${provider} API quota has been exceeded. Wait for it to reset, upgrade your plan, or switch to a different provider in Settings.`;
    case "RATE_LIMITED":
      return `${provider} rate limit reached. Wait a moment and try again, or switch to a different provider.`;
    case "TIMEOUT":
      return `${provider} request timed out. The service might be busy — try again in a moment.`;
    case "PROVIDER_ERROR":
      return `${provider} returned an unexpected error. Try again, or switch to a different provider in Settings.`;
    case "PARSE_ERROR":
      return `${provider} returned a response that couldn't be parsed. Try again.`;
  }
}

function classifyHttpError(status: number, body: string, provider: string): AiError {
  if (status === 401 || status === 403) {
    return new AiError("INVALID_KEY", provider, `${provider} returned ${status}: ${body}`);
  }
  if (status === 429) {
    // Distinguish between rate limit and quota
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

// ── Response Schemas ──────────────────────────────────────────────────────

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

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

// ── Public AI Functions ───────────────────────────────────────────────────

export async function generateMotivationQuotes(userId: string) {
  const dashboard = await getDashboardData(userId);
  const payload = {
    profile: {
      targetRole: dashboard.settings.targetRole,
      planStyle: dashboard.settings.planStyle,
      university: dashboard.settings.university,
      graduationYear: dashboard.settings.graduationYear,
      weeklyTheme: dashboard.settings.weeklyTheme,
    },
    metrics: dashboard.metrics,
    todayCompleted: dashboard.today.checkins,
    planner: dashboard.planner.summary,
  };

  const response = await dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an intense but constructive engineering career coach. Generate 4 short, sharp motivational quotes that feel specific to the student's current progress and targets. Each quote must be one sentence and should push the user toward immediate action.",
    "Return only a JSON object with a single array field 'quotes'.",
    MotivationSchema,
    userId,
  );
  return response.quotes;
}

export async function generateInsight(
  userId: string,
  type: "dsa" | "build",
  title: string,
  context: string,
) {
  const dashboard = await getDashboardData(userId);
  const payload = {
    type,
    title,
    context,
    targetRole: dashboard.settings.targetRole,
    primaryGoal: dashboard.settings.primaryGoal,
    customAiInstructions: dashboard.settings.customAiInstructions,
  };
  
  const response = await dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are a principal engineer mentoring a mid-level dev. Generate a 1-2 sentence core technical insight/takeaway based on the problem title and minimal context.",
    "Return only a JSON object with a single string field 'insight'.",
    InsightSchema,
    userId,
  );
  return response.insight;
}

export async function generateWeaknessCurriculum(userId: string) {
  const dashboard = await getDashboardData(userId);
  const recentDsa = dashboard.recentDsa;
  
  const payload = {
    targetRole: dashboard.settings.targetRole,
    targetCompanies: dashboard.settings.targetCompanies,
    recentProblemsAndInsights: recentDsa.map(d => ({ title: d.title, pattern: d.pattern, insight: d.insight }))
  };

  const response = await dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an expert technical interviewer. Analyze these recent data structure problems and the user's insights to cluster their WEAKNESSES. Generate a 2-3 sentence strict weekend curriculum focusing on their most frequent blind spots.",
    "Return only a JSON object with a single string field 'curriculum'.",
    WeaknessSchema,
    userId,
  );
  return response.curriculum;
}

export async function predictApplicationMatch(
  userId: string,
  company: string,
  role: string,
) {
  const dashboard = await getDashboardData(userId);
  const payload = {
    company,
    role,
    primaryGoal: dashboard.settings.primaryGoal,
    targetRole: dashboard.settings.targetRole,
    strengths: dashboard.settings.customAiInstructions,
  };

  const response = await dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an elite career matching algorithm. Score the match (0-100) between the user's primary goal and this specific job application. Provide a 1-sentence harsh analysis.",
    "Return only a JSON object with 'score' (number) and 'analysis' (string).",
    MatchSchema,
    userId,
  );
  return response;
}

export async function generateCoachResponse(userId: string) {
  const dashboard = await getDashboardData(userId);
  const payload = {
    target: dashboard.settings.primaryGoal,
    targetRole: dashboard.settings.targetRole,
    targetCompanies: dashboard.settings.targetCompanies,
    university: dashboard.settings.university,
    degree: dashboard.settings.degree,
    graduationYear: dashboard.settings.graduationYear,
    planStyle: dashboard.settings.planStyle,
    customAiInstructions: dashboard.settings.customAiInstructions,
    provider: dashboard.settings.aiProvider,
    metrics: dashboard.metrics,
    profileLinks: {
      github: dashboard.settings.githubUrl,
      leetcode: dashboard.settings.leetcodeUrl,
      linkedin: dashboard.settings.linkedinUrl,
      codeforces: dashboard.settings.codeforcesUrl,
      codechef: dashboard.settings.codechefUrl,
      hackerrank: dashboard.settings.hackerrankUrl,
      jobTracker: dashboard.settings.jobTrackerUrl,
    },
    previousDay: dashboard.previousDay,
    recentDsa: dashboard.recentDsa.slice(0, 4),
    recentBuilds: dashboard.recentBuilds.slice(0, 3),
    recentApplications: dashboard.recentApplications.slice(0, 4),
    today: dashboard.today,
  };

  return dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    systemPrompt,
    jsonPromptPrefix,
    CoachResponseSchema,
    userId,
  );
}

export async function generateStudentStrategy(userId: string): Promise<StudentStrategy> {
  const dashboard = await getDashboardData(userId);
  const payload = {
    studentProfile: {
      targetRole: dashboard.settings.targetRole,
      primaryGoal: dashboard.settings.primaryGoal,
      targetCompanies: dashboard.settings.targetCompanies,
      university: dashboard.settings.university,
      degree: dashboard.settings.degree,
      graduationYear: dashboard.settings.graduationYear,
      planStyle: dashboard.settings.planStyle,
      customAiInstructions: dashboard.settings.customAiInstructions,
      links: {
        github: dashboard.settings.githubUrl,
        leetcode: dashboard.settings.leetcodeUrl,
        codeforces: dashboard.settings.codeforcesUrl,
        codechef: dashboard.settings.codechefUrl,
        hackerrank: dashboard.settings.hackerrankUrl,
        jobTracker: dashboard.settings.jobTrackerUrl,
      },
    },
    metrics: dashboard.metrics,
    today: dashboard.today,
    recentDsa: dashboard.recentDsa.slice(0, 6),
    recentBuilds: dashboard.recentBuilds.slice(0, 4),
    recentApplications: dashboard.recentApplications.slice(0, 6),
    history: dashboard.history.slice(-21),
  };

  return dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an elite placement strategist for engineering students. Produce a practical, student-specific interview preparation strategy using the stored profile, history, and current momentum. Be concrete, realistic, and prioritize the highest ROI actions.",
    "Return only a JSON object with these exact string fields: headline, todayMission, dsaPriority, buildPriority, applicationPriority, mockInterviewTask, realityCheck.",
    StudentStrategySchema,
    userId,
  );
}

export async function generatePlannerSuggestionPack(
  userId: string,
): Promise<PlannerSuggestionPack> {
  const dashboard = await getDashboardData(userId);
  const payload = {
    studentProfile: {
      targetRole: dashboard.settings.targetRole,
      primaryGoal: dashboard.settings.primaryGoal,
      targetCompanies: dashboard.settings.targetCompanies,
      university: dashboard.settings.university,
      degree: dashboard.settings.degree,
      graduationYear: dashboard.settings.graduationYear,
      planStyle: dashboard.settings.planStyle,
      weeklyTheme: dashboard.settings.weeklyTheme,
      customAiInstructions: dashboard.settings.customAiInstructions,
    },
    targets: {
      dailyTaskTarget: dashboard.settings.weekdayTaskTarget,
      weekendTaskTarget: dashboard.settings.weekendTaskTarget,
      weeklyDsaTarget: dashboard.settings.weeklyDsaTarget,
      weeklyApplicationTarget: dashboard.settings.weeklyApplicationTarget,
      weeklyBuildTarget: dashboard.settings.weeklyBuildTarget,
    },
    planner: dashboard.planner,
    metrics: dashboard.metrics,
    today: dashboard.today,
    recentDsa: dashboard.recentDsa.slice(0, 5),
    recentBuilds: dashboard.recentBuilds.slice(0, 4),
    recentApplications: dashboard.recentApplications.slice(0, 5),
  };

  return dispatchWithFallback(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an elite interview-preparation planner for students. Generate a practical task pack with daily, weekly, and weekend tasks based on the student's stored progress, weak spots, targets, and current workload. Weekend tasks should be heavier and more ambitious than weekday tasks. Keep tasks specific, realistic, and action-oriented.",
    "Return only a JSON object with these exact fields: headline, daily, weekly, weekend. Each task item must include title, details, scope, category, priority, and estimateMinutes.",
    PlannerSuggestionPackSchema,
    userId,
  );
}

// ── Chat (free-form conversational AI) ────────────────────────────────────

export async function streamChat(
  userId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  dashboardContext: string,
): Promise<ReadableStream<Uint8Array>> {
  const systemMessage = `You are Career OS Assistant — a friendly, knowledgeable career coach built into the user's career tracking dashboard.

You have access to the user's current career data:
${dashboardContext}

Guidelines:
- Be concise but helpful. Use bullet points for lists.
- Give specific, actionable advice based on their actual data.
- If they ask about DSA, reference their recent problems and patterns.
- If they ask about applications, reference their recent applications and targets.
- If they ask about planning, consider their current metrics and goals.
- Be encouraging but honest. Don't sugarcoat if they're falling behind.
- Format responses with markdown for readability.`;

  const order: AiProvider[] = ["gemini", "openai", "openrouter"];
  const errors: AiError[] = [];

  for (const provider of order) {
    const apiKey = await resolveAiProviderKey(userId, provider);
    if (!apiKey) continue;

    try {
      if (provider === "gemini") {
        return await streamGemini(apiKey, systemMessage, messages);
      }
      if (provider === "openai") {
        return await streamOpenAI(apiKey, systemMessage, messages);
      }
      return await streamOpenRouter(apiKey, systemMessage, messages);
    } catch (err) {
      const aiErr = err instanceof AiError ? err : new AiError("PROVIDER_ERROR", provider, String(err));
      errors.push(aiErr);
      console.warn(`[AI] ${provider} stream failed (${aiErr.code}): ${aiErr.message}, trying next...`);
    }
  }

  // Final fallback (keyless, completely free)
  try {
    return await streamPollinations(systemMessage, messages);
  } catch (err) {
    throw new AiError("PROVIDER_ERROR", "Pollinations", String(err));
  }

  if (errors.length === 0) {
    throw new AiError("NO_KEY", "any", "No AI provider configured");
  }

  // If all failed, throw the first error we encountered
  throw errors[0];
}

async function streamPollinations(
  systemMessage: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({ 
    apiKey: "dummy", 
    baseURL: "https://text.pollinations.ai/openai/v1" 
  });

  const stream = await client.chat.completions.create({
    model: "openai",
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    }
  });
}

async function streamGemini(
  apiKey: string,
  systemMessage: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream<Uint8Array>> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemMessage }] },
        contents,
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
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    },
  });
}

async function streamOpenAI(
  apiKey: string,
  systemMessage: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    }
  });
}

async function streamOpenRouter(
  apiKey: string,
  systemMessage: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<ReadableStream<Uint8Array>> {
  const client = new OpenAI({ 
    apiKey, 
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": getApplicationOrigin(),
      "X-OpenRouter-Title": "Career OS",
    }
  });

  const stream = await client.chat.completions.create({
    model: "google/gemma-2-9b-it:free",
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    }
  });
}

// ── Dispatch with Provider Fallback ───────────────────────────────────────

const providerOrder: AiProvider[] = ["gemini", "openai", "openrouter"];

async function dispatchWithFallback<T extends z.ZodTypeAny>(
  payload: unknown,
  preferredProvider: string,
  model: string,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
  userId: string,
): Promise<z.infer<T>> {
  // Build ordered list: preferred provider first, then others
  const ordered = [
    preferredProvider as AiProvider,
    ...providerOrder.filter((p) => p !== preferredProvider),
  ];

  const errors: AiError[] = [];

  for (const provider of ordered) {
    const apiKey = await resolveAiProviderKey(userId, provider);
    if (!apiKey) continue; // skip providers with no key

    try {
      return await dispatchToProvider(payload, provider, model, sysPrompt, jsonPrefix, schema, apiKey);
    } catch (err) {
      const aiErr =
        err instanceof AiError
          ? err
          : new AiError("PROVIDER_ERROR", provider, String(err));
      errors.push(aiErr);
      console.warn(`[AI] ${provider} failed (${aiErr.code}): ${aiErr.message}, trying next...`);

      if (aiErr.code === "INVALID_KEY") continue;
    }
  }

  // Final fallback (keyless, completely free)
  try {
    return await generateWithPollinations(payload, sysPrompt, jsonPrefix, schema);
  } catch (err) {
    console.warn(`[AI] Final pollinations fallback failed:`, err);
  }

  // All providers failed
  if (errors.length === 0) {
    throw new AiError(
      "NO_KEY",
      "any",
      "No AI provider is configured. Add an API key in Settings → AI Keys.",
    );
  }

  // Throw the most relevant error
  throw errors[0];
}

async function dispatchToProvider<T extends z.ZodTypeAny>(
  payload: unknown,
  provider: AiProvider,
  model: string,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
  apiKey: string,
): Promise<z.infer<T>> {
  if (provider === "openai") {
    return generateWithOpenAI(payload, model, sysPrompt, schema, apiKey);
  }
  if (provider === "gemini") {
    return generateWithGemini(payload, model, sysPrompt, jsonPrefix, schema, apiKey);
  }
  return generateWithOpenRouter(payload, model, sysPrompt, jsonPrefix, schema, apiKey);
}

// ── Provider Implementations ──────────────────────────────────────────────

async function generateWithOpenAI<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  sysPrompt: string,
  schema: T,
  apiKey: string,
) {
  try {
    const client = new OpenAI({ apiKey });

    const response = await client.responses.parse({
      model: model || "gpt-4o-mini",
      input: [
        { role: "system", content: sysPrompt },
        { role: "user", content: JSON.stringify(payload, null, 2) },
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
  } catch (err) {
    if (err instanceof AiError) throw err;

    // OpenAI SDK throws typed errors
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("401") || errMsg.includes("Incorrect API key")) {
      throw new AiError("INVALID_KEY", "OpenAI", errMsg);
    }
    if (errMsg.includes("429")) {
      if (errMsg.toLowerCase().includes("quota")) {
        throw new AiError("QUOTA_EXCEEDED", "OpenAI", errMsg);
      }
      throw new AiError("RATE_LIMITED", "OpenAI", errMsg);
    }
    if (errMsg.includes("timeout") || errMsg.includes("ETIMEDOUT")) {
      throw new AiError("TIMEOUT", "OpenAI", errMsg);
    }
    throw new AiError("PROVIDER_ERROR", "OpenAI", errMsg);
  }
}

async function generateWithGemini<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
  apiKey: string,
) {
  const geminiModel = model && model.startsWith("gemini") ? model : "gemini-2.0-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: sysPrompt }],
        },
        contents: [
          {
            parts: [
              {
                text: `${jsonPrefix}\n${JSON.stringify(payload, null, 2)}`,
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

  const text = data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") ?? "";

  try {
    return parseJsonWithSchema(text, schema);
  } catch {
    throw new AiError("PARSE_ERROR", "Gemini", `Failed to parse Gemini response: ${text.slice(0, 200)}`);
  }
}

async function generateWithOpenRouter<T extends z.ZodTypeAny>(
  payload: unknown,
  model: string,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
  apiKey: string,
) {
  // Use a free model by default for OpenRouter
  const routerModel = model && !model.startsWith("gpt") && !model.startsWith("gemini")
    ? model
    : "google/gemma-2-9b-it:free";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getApplicationOrigin(),
      "X-OpenRouter-Title": "Career OS",
    },
    body: JSON.stringify({
      model: routerModel,
      messages: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: `${jsonPrefix}\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw classifyHttpError(response.status, body, "OpenRouter");
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
    throw new AiError("PARSE_ERROR", "OpenRouter", `Failed to parse OpenRouter response: ${text.slice(0, 200)}`);
  }
}

async function generateWithPollinations<T extends z.ZodTypeAny>(
  payload: unknown,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
): Promise<z.infer<T>> {
  const response = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sysPrompt + " " + jsonPrefix },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Pollinations failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  return parseJsonWithSchema(text, schema);
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

const systemPrompt =
  "You are a strict but caring study coach for a final-year CS student targeting MAANG-style product roles. Be direct, realistic, and actionable. Return concise advice only.";

const jsonPromptPrefix =
  "Return only a JSON object with these exact string fields: summary, biggestRisk, focusTheme, morningPlan, nightPlan, applyPlan, oneCut, weekendMission.";
