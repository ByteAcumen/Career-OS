import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { resolveAiProviderKey } from "@/lib/ai-credentials";
import { getDashboardData } from "@/lib/dashboard";
import type { StudentStrategy } from "@/lib/types";

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
  quote: z.string(),
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

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

export async function generateMotivation(userId: string) {
  const dashboard = await getDashboardData(userId);
  const payload = {
    profile: {
      targetRole: dashboard.settings.targetRole,
      planStyle: dashboard.settings.planStyle,
      university: dashboard.settings.university,
      graduationYear: dashboard.settings.graduationYear,
    },
    metrics: dashboard.metrics,
    todayCompleted: dashboard.today.checkins,
  };

  const response = await dispatchAiRequest(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an intense elite engineering coach. Generate a single highly motivating 1-sentence quote based on today's progress to get the user to execute deep work. Be sharp and slightly aggressive.",
    "Return only a JSON object with a single string field 'quote'.",
    MotivationSchema,
    userId,
  );
  return response.quote;
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
  
  const response = await dispatchAiRequest(
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

  const response = await dispatchAiRequest(
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

  const response = await dispatchAiRequest(
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

  return dispatchAiRequest(
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

  return dispatchAiRequest(
    payload,
    dashboard.settings.aiProvider,
    dashboard.settings.openAiModel,
    "You are an elite placement strategist for engineering students. Produce a practical, student-specific interview preparation strategy using the stored profile, history, and current momentum. Be concrete, realistic, and prioritize the highest ROI actions.",
    "Return only a JSON object with these exact string fields: headline, todayMission, dsaPriority, buildPriority, applicationPriority, mockInterviewTask, realityCheck.",
    StudentStrategySchema,
    userId,
  );
}

async function dispatchAiRequest<T extends z.ZodTypeAny>(
  payload: unknown,
  provider: string,
  model: string,
  sysPrompt: string,
  jsonPrefix: string,
  schema: T,
  userId: string,
): Promise<z.infer<T>> {
  if (provider === "openai") {
    return generateWithOpenAI(payload, model, sysPrompt, schema, userId);
  }
  if (provider === "gemini") {
    return generateWithGemini(payload, model, sysPrompt, jsonPrefix, schema, userId);
  }
  return generateWithOpenRouter(payload, model, sysPrompt, jsonPrefix, schema, userId);
}

async function generateWithOpenAI<T extends z.ZodTypeAny>(
  payload: unknown, 
  model: string, 
  sysPrompt: string,
  schema: T,
  userId: string,
) {
  const apiKey = resolveAiProviderKey(userId, "openai");
  if (!apiKey) {
    throw new Error("OpenAI is not configured for this account or the server.");
  }

  const client = new OpenAI({
    apiKey,
  });

  const response = await client.responses.parse({
    model: model || "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: sysPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(schema, "response"),
    },
  });

  const output = response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .find((item) => item.type === "output_text" && item.parsed);

  if (!output || output.type !== "output_text" || !output.parsed) {
    throw new Error("OpenAI response could not be parsed");
  }

  return output.parsed as z.infer<T>;
}

async function generateWithGemini<T extends z.ZodTypeAny>(
  payload: unknown, 
  model: string, 
  sysPrompt: string, 
  jsonPrefix: string,
  schema: T,
  userId: string,
) {
  const apiKey = resolveAiProviderKey(userId, "gemini");
  if (!apiKey) {
    throw new Error("Gemini is not configured for this account or the server.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((item) => item.text ?? "").join("") ?? "";
  return parseJsonWithSchema(text, schema);
}

async function generateWithOpenRouter<T extends z.ZodTypeAny>(
  payload: unknown, 
  model: string, 
  sysPrompt: string, 
  jsonPrefix: string,
  schema: T,
  userId: string,
) {
  const apiKey = resolveAiProviderKey(userId, "openrouter");
  if (!apiKey) {
    throw new Error("OpenRouter is not configured for this account or the server.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getApplicationOrigin(),
      "X-OpenRouter-Title": "Career OS",
    },
    body: JSON.stringify({
      model: model || "openai/gpt-4o-mini",
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
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

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
  const configured =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "http://localhost:3000";

  try {
    return new URL(configured).origin;
  } catch {
    return "http://localhost:3000";
  }
}

const systemPrompt =
  "You are a strict but caring study coach for a final-year CS student targeting MAANG-style product roles. Be direct, realistic, and actionable. Return concise advice only.";

const jsonPromptPrefix =
  "Return only a JSON object with these exact string fields: summary, biggestRisk, focusTheme, morningPlan, nightPlan, applyPlan, oneCut, weekendMission.";
