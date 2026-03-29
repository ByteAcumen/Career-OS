import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getDashboardData } from "@/lib/dashboard";

const CoachResponseSchema = z.object({
  summary: z.string(),
  biggestRisk: z.string(),
  morningPlan: z.string(),
  nightPlan: z.string(),
  applyPlan: z.string(),
  oneCut: z.string(),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;

export async function generateCoachResponse() {
  const dashboard = await getDashboardData();
  const payload = {
    target: dashboard.settings.primaryGoal,
    provider: dashboard.settings.aiProvider,
    metrics: dashboard.metrics,
    profileLinks: {
      github: dashboard.settings.githubUrl,
      leetcode: dashboard.settings.leetcodeUrl,
    },
    previousDay: dashboard.previousDay,
    recentDsa: dashboard.recentDsa.slice(0, 4),
    recentBuilds: dashboard.recentBuilds.slice(0, 3),
    recentApplications: dashboard.recentApplications.slice(0, 4),
    today: dashboard.today,
  };

  if (dashboard.settings.aiProvider === "openai") {
    return generateWithOpenAI(payload, dashboard.settings.openAiModel);
  }

  if (dashboard.settings.aiProvider === "gemini") {
    return generateWithGemini(payload, dashboard.settings.openAiModel);
  }

  return generateWithOpenRouter(payload, dashboard.settings.openAiModel);
}

async function generateWithOpenAI(payload: unknown, model: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.parse({
    model: model || "gpt-4o-mini",
    input: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
    text: {
      format: zodTextFormat(CoachResponseSchema, "coach_response"),
    },
  });

  const output = response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .find((item) => item.type === "output_text" && item.parsed);

  if (!output || output.type !== "output_text" || !output.parsed) {
    throw new Error("OpenAI response could not be parsed");
  }

  return output.parsed;
}

async function generateWithGemini(payload: unknown, model: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [
              {
                text: `${jsonPromptPrefix}\n${JSON.stringify(payload, null, 2)}`,
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
  return parseCoachJson(text);
}

async function generateWithOpenRouter(payload: unknown, model: string) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://github.com/ByteAcumen/Career-OS",
      "X-OpenRouter-Title": "Career OS",
    },
    body: JSON.stringify({
      model: model || "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${jsonPromptPrefix}\n${JSON.stringify(payload, null, 2)}`,
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
  return parseCoachJson(text);
}

function parseCoachJson(text: string) {
  const cleaned = text.trim();
  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? cleaned;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }

  return CoachResponseSchema.parse(JSON.parse(raw.slice(start, end + 1)));
}

const systemPrompt =
  "You are a strict but caring study coach for a final-year CS student targeting MAANG-style product roles. Be direct, realistic, and actionable. Return concise advice only.";

const jsonPromptPrefix =
  'Return only a JSON object with these exact string fields: summary, biggestRisk, morningPlan, nightPlan, applyPlan, oneCut.';
