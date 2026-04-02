import { z } from "zod";

const optionalUrl = z.string().url().or(z.literal(""));

export const settingsSchema = z.object({
  sheetUrl: optionalUrl,
  resumeUrl: optionalUrl,
  githubUrl: optionalUrl,
  leetcodeUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  codeforcesUrl: optionalUrl,
  codechefUrl: optionalUrl,
  hackerrankUrl: optionalUrl,
  jobTrackerUrl: optionalUrl,
  primaryGoal: z.string().min(5).max(220),
  targetRole: z.string().min(2).max(140),
  targetCompanies: z.string().max(300),
  university: z.string().max(140),
  degree: z.string().max(140),
  graduationYear: z.string().max(20),
  planStyle: z.string().max(220),
  customAiInstructions: z.string().max(1500),
  aiProvider: z.enum(["openai", "gemini", "openrouter"]),
  googleAppsScriptUrl: optionalUrl,
  openAiModel: z.string().min(1),
  weekendDsaMinutes: z.number().int().min(60).max(480),
  weekendBuildMinutes: z.number().int().min(60).max(480),
  weeklyDsaTarget: z.number().int().min(1).max(50),
  weeklyApplicationTarget: z.number().int().min(1).max(30),
  weeklyBuildTarget: z.number().int().min(1).max(20),
  weekdayDeepWorkMinutes: z.number().int().min(30).max(240),
  weekdaySupportMinutes: z.number().int().min(15).max(180),
  timerFocusMinutes: z.number().int().min(15).max(180),
  timerBreakMinutes: z.number().int().min(5).max(60),
});

export const aiKeySchema = z.object({
  provider: z.enum(["openai", "gemini", "openrouter"]),
  apiKey: z.string().min(10).max(500),
});

export const aiKeyDeleteSchema = z.object({
  provider: z.enum(["openai", "gemini", "openrouter"]),
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
