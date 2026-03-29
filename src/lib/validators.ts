import { z } from "zod";

export const settingsSchema = z.object({
  sheetUrl: z.string().url(),
  resumeUrl: z.string().url(),
  githubUrl: z.string().url(),
  leetcodeUrl: z.string().url(),
  primaryGoal: z.string().min(5).max(220),
  aiProvider: z.enum(["openai", "gemini", "openrouter"]),
  googleAppsScriptUrl: z.string().url().or(z.literal("")),
  openAiModel: z.string().min(1),
  weekendDsaMinutes: z.number().int().min(60).max(480),
  weekendBuildMinutes: z.number().int().min(60).max(480),
});

export const checkinSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  key: z.enum([
    "morningRevision",
    "microRevision",
    "deepWork",
    "supportBlock",
    "shutdownReview",
  ]),
  value: z.boolean(),
});

export const reviewSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(1000).optional().default(""),
  tomorrowTask: z.string().max(300).optional().default(""),
});

export const dsaEntrySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2).max(160),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  pattern: z.string().min(2).max(80),
  insight: z.string().max(400).optional().default(""),
  repositoryUrl: z.string().url().or(z.literal("")).optional().default(""),
});

export const buildEntrySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2).max(160),
  area: z.enum(["React", "NestJS", "TypeScript", "AI", "System Design"]),
  proof: z.string().max(300).optional().default(""),
  impact: z.string().max(300).optional().default(""),
  repositoryUrl: z.string().url().or(z.literal("")).optional().default(""),
});

export const applicationEntrySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  company: z.string().min(2).max(120),
  role: z.string().min(2).max(160),
  status: z.enum([
    "Applied",
    "Referral asked",
    "OA scheduled",
    "Interview",
    "Rejected",
  ]),
  note: z.string().max(400).optional().default(""),
  roleUrl: z.string().url().or(z.literal("")).optional().default(""),
});
