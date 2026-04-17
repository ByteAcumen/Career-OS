import {
  buildResumeDraft,
  type ResumeDraft,
} from "@/features/resume/build-resume";
import type { ParsedResumeUpload } from "@/features/resume/parse-uploaded-resume";
import type { ResumeRequestInput } from "@/features/resume/contracts";
import { optimizeResumeDraftWithAi } from "@/lib/ai";
import type { DashboardData } from "@/lib/types";
import { parseResumeWithAi } from "./parse-resume-with-ai";
import { tailorResumeWithAi } from "./tailor-resume-with-ai";

type GenerateResumeDraftOptions = {
  userId: string;
  dashboard: DashboardData;
  user: {
    name?: string | null;
    email: string;
  };
  input: ResumeRequestInput;
  upload?: ParsedResumeUpload | null;
};

export type GeneratedResumeResult = {
  resume: ResumeDraft;
  upload: ParsedResumeUpload | null;
  optimizedWithAi: boolean;
};

export async function generateResumeDraftForUser(
  options: GenerateResumeDraftOptions,
): Promise<GeneratedResumeResult> {
  const baseDraft = buildResumeDraft(options.dashboard, {
    user: options.user,
    targetRole: options.input.targetRole,
    company: options.input.company,
    jobDescription: options.input.jobDescription,
    emphasis: options.input.emphasis,
    sourceResumeText: options.input.resumeText ?? options.upload?.extractedText ?? null,
    sourceFileName: options.input.sourceFileName ?? options.upload?.fileName ?? null,
  });

  const shouldOptimize =
    options.input.optimizeWithAi !== false &&
    Boolean(options.input.jobDescription || options.input.resumeText || options.upload?.extractedText);

  if (!shouldOptimize) {
    return {
      resume: baseDraft,
      upload: options.upload ?? null,
      optimizedWithAi: false,
    };
  }

  try {
    const rawText = options.input.resumeText ?? options.upload?.extractedText;
    const jobDescription = options.input.jobDescription ?? "";
    
    // Agent 1: Parse (if there is dense raw text)
    let parsedResume = null;
    if (rawText && rawText.length > 50) {
      parsedResume = await parseResumeWithAi(rawText);
    }
    
    // Agent 2: Tailor (Groq 70B Fast Generation)
    const tailored = await tailorResumeWithAi(
      parsedResume,
      jobDescription,
      {
        recentBuilds: options.dashboard.recentBuilds.slice(0, 5),
        recentDsa: options.dashboard.recentDsa.slice(0, 5),
        goal: options.dashboard.settings.primaryGoal,
      }
    );

    if (tailored && tailored.resume) {
       // Merge into ResumeDraft format
       const optimized: ResumeDraft = {
         ...baseDraft,
         mode: "ai-optimized",
         matchedKeywords: tailored.matchedKeywords ?? [],
         editingNotes: tailored.editingNotes ?? [],
         summaryBullets: [],
         projectHighlights: tailored.resume.projects?.map(p => ({
            title: p.title || "Project",
            subtitle: p.tech || "",
            bullets: p.bullets?.length ? p.bullets : ["Contributed to core development"],
            link: p.link || null,
         })) || baseDraft.projectHighlights,
         // Push parsed experience into focusAreas/etc for now
         improvementSummary: "Rewritten with Groq 70B & Gemini Flash",
       };
       // Add Experience to projectHighlights to map onto our UI schema
       if (tailored.resume.experience) {
           optimized.projectHighlights.unshift(...tailored.resume.experience.map(e => ({
               title: `${e.role} at ${e.company}`,
               subtitle: e.dates || "Recent",
               bullets: e.bullets?.length ? e.bullets : ["Led software engineering initiatives"],
               link: null
           })));
       }
       return { resume: optimized, upload: options.upload ?? null, optimizedWithAi: true };
    }

    // Fallback to older pipeline
    const optimized = await optimizeResumeDraftWithAi({
      userId: options.userId,
      dashboard: options.dashboard,
      baseDraft,
      sourceResumeText: rawText,
      sourceFileName: options.input.sourceFileName ?? options.upload?.fileName,
      jobDescription: options.input.jobDescription,
    });

    return {
      resume: optimized,
      upload: options.upload ?? null,
      optimizedWithAi: true,
    };
  } catch (error) {
    console.warn(
      `[resume] AI optimization fallback triggered: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    return {
      resume: baseDraft,
      upload: options.upload ?? null,
      optimizedWithAi: false,
    };
  }
}
