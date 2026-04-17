import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { saveAiCredential } from "@/lib/ai-credentials";
import { getRequestSession } from "@/lib/auth-session";
import { getDashboardData, saveSettings } from "@/lib/dashboard";
import { rateLimit } from "@/lib/rate-limit";
import type { AiProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

const aiProviders: AiProvider[] = ["openai", "gemini", "openrouter"];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500, "URL is too long.")
  .transform(normalizeUrl)
  .refine((value) => !value || isValidUrl(value), "Please provide a valid URL.");

const requiredUrlSchema = optionalUrlSchema.refine(
  (value) => value.length > 0,
  "This URL is required.",
);

const optionalAiKeySchema = z.string().trim().max(500).optional().default("");

const onboardingCompleteSchema = z.object({
  primaryGoal: z.string().trim().min(8).max(220),
  targetRole: z.string().trim().min(2).max(140),
  university: z.string().trim().min(2).max(140),
  degree: z.string().trim().max(140).optional().default(""),
  graduationYear: z.string().trim().max(20).optional().default(""),
  planStyle: z.string().trim().min(5).max(220),
  linkedinUrl: requiredUrlSchema,
  jobTrackerUrl: requiredUrlSchema,
  githubUrl: optionalUrlSchema.optional().default(""),
  leetcodeUrl: optionalUrlSchema.optional().default(""),
  portfolioUrl: optionalUrlSchema.optional().default(""),
  resumeUrl: optionalUrlSchema.optional().default(""),
  customAiInstructions: z.string().trim().max(1500).optional().default(""),
  aiProvider: z.enum(aiProviders).optional().default("openai"),
  aiKeys: z
    .object({
      openai: optionalAiKeySchema,
      gemini: optionalAiKeySchema,
      openrouter: optionalAiKeySchema,
    })
    .optional()
    .default({
      openai: "",
      gemini: "",
      openrouter: "",
    }),
});

export async function POST(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const retryAfterSeconds = rateLimit(request, `onboarding:${session.user.id}`, {
    limit: 12,
    windowMs: 60_000,
  });

  if (retryAfterSeconds) {
    return NextResponse.json(
      {
        ok: false,
        message: `Too many setup requests. Try again in ${retryAfterSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  try {
    const payload = onboardingCompleteSchema.parse(await request.json());
    const currentSettings = (await getDashboardData(session.user.id)).settings;

    const nextSettings = {
      ...currentSettings,
      primaryGoal: payload.primaryGoal,
      targetRole: payload.targetRole,
      university: payload.university,
      degree: payload.degree,
      graduationYear: payload.graduationYear,
      planStyle: payload.planStyle,
      linkedinUrl: payload.linkedinUrl,
      jobTrackerUrl: payload.jobTrackerUrl,
      githubUrl: payload.githubUrl,
      leetcodeUrl: payload.leetcodeUrl,
      portfolioUrl: payload.portfolioUrl,
      resumeUrl: payload.resumeUrl,
      customAiInstructions: payload.customAiInstructions,
      aiProvider: payload.aiProvider,
    };

    const savedSettings = await saveSettings(session.user.id, nextSettings);

    for (const provider of aiProviders) {
      const apiKey = payload.aiKeys?.[provider]?.trim();
      if (apiKey) {
        await saveAiCredential(session.user.id, provider, apiKey);
      }
    }

    return NextResponse.json({
      ok: true,
      onboardingCompleted: savedSettings.onboardingCompleted,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const firstMessage = error.issues[0]?.message ?? "Invalid onboarding input.";
      return NextResponse.json({ ok: false, message: firstMessage }, { status: 400 });
    }

    console.error("Failed to complete onboarding:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to complete setup right now." },
      { status: 500 },
    );
  }
}

