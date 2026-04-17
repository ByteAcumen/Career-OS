import { z } from "zod";

export const resumeEmphasisValues = ["balanced", "projects", "dsa"] as const;

export const ResumeRequestSchema = z.object({
  targetRole: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  jobDescription: z.string().max(10_000).optional(),
  emphasis: z.enum(resumeEmphasisValues).optional(),
  resumeText: z.string().max(20_000).optional(),
  sourceFileName: z.string().max(220).optional(),
  optimizeWithAi: z.boolean().optional(),
});

export const ResumeProjectSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().min(1).max(160),
  bullets: z.array(z.string().min(4).max(260)).min(1).max(4),
  link: z.string().url().nullable().optional(),
});

export const ResumeLinkSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.string().url(),
});

export const ResumeSkillGroupSchema = z.object({
  label: z.string().min(1).max(60),
  items: z.array(z.string().min(1).max(80)).min(1).max(12),
});

export const ResumeDraftSchema = z.object({
  mode: z.enum(["deterministic", "ai-optimized"]),
  generatedAt: z.string(),
  template: z.enum(["sb2nov"]).default("sb2nov"),
  targetRole: z.string().min(1).max(160),
  company: z.string().nullable(),
  matchedKeywords: z.array(z.string().min(1).max(60)).max(12),
  header: z.object({
    name: z.string().min(1).max(160),
    email: z.string().email(),
    title: z.string().min(1).max(160),
    education: z.string().nullable(),
    links: z.array(ResumeLinkSchema).max(8),
  }),
  summaryBullets: z.array(z.string().min(4).max(260)).min(1).max(4),
  focusAreas: z.array(z.string().min(1).max(60)).min(1).max(10),
  skills: z.array(ResumeSkillGroupSchema).max(6).default([]),
  projectHighlights: z.array(ResumeProjectSchema).min(1).max(4),
  problemSolvingHighlights: z.array(z.string().min(4).max(260)).min(1).max(5),
  editingNotes: z.array(z.string().min(4).max(260)).min(1).max(6),
  improvementSummary: z.string().nullable(),
  importedResume: z.object({
    used: z.boolean(),
    fileName: z.string().nullable(),
  }),
  markdown: z.string().min(1),
  latex: z.string().min(1),
});

export type ResumeRequestInput = z.infer<typeof ResumeRequestSchema>;
export type ResumeDraftInput = z.infer<typeof ResumeDraftSchema>;
